const { assert, expect } = require("chai");
const { artifacts } = require("hardhat");
const { toBN } = require('web3-utils');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

const toUnit = amount => BigInt(amount) * 10n ** 18n;

const currentTime = async () => {
    const { timestamp } = await ethers.provider.getBlock("latest");
    return timestamp;
};

const ensureOnlyExpectedMutativeFunctions = async ({
    abi,
    hasFallback = false,
    expected = [],
    ignoreParents = [],
}) => {
    const removeExcessParams = abiEntry => {
        // Clone to not mutate anything processed by truffle
        const clone = JSON.parse(JSON.stringify(abiEntry));
        // remove the signature in the cases where it's in the parent ABI but not the subclass
        delete clone.signature;
        // remove input and output named params
        (clone.inputs || []).map(input => {
            delete input.name;
            return input;
        });
        (clone.outputs || []).map(input => {
            delete input.name;
            return input;
        });
        return clone;
    };

    ignoreParentsABI = {};
    for (let i = 0; i < ignoreParents.length; i++) {
        ignoreParentsABI[ignoreParents[i]] = (await artifacts.readArtifact(ignoreParents[i])).abi;
    }
    const combinedParentsABI = ignoreParents
        .reduce((memo, parent) => memo.concat(ignoreParentsABI[parent]), [])
        .map(removeExcessParams);

    const fncs = abi
        .filter(
            ({ type, stateMutability }) =>
                type === 'function' && stateMutability !== 'view' && stateMutability !== 'pure'
        )
        .map(removeExcessParams)
        .filter(
            entry =>
                !combinedParentsABI.find(
                    parentABIEntry => JSON.stringify(parentABIEntry) === JSON.stringify(entry)
                )
        )
        .map(({ name }) => name);

    assert.deepEqual(
        fncs.sort(),
        expected.sort(),
        'Mutative functions should only be those expected.'
    );

    const fallbackFnc = abi.filter(({ type, stateMutability }) => type === 'fallback');

    assert.equal(
        fallbackFnc.length > 0,
        hasFallback,
        hasFallback ? 'No fallback function found' : 'Fallback function found when not expected'
    );
};

describe('StakingRewards', () => {
	let rewardsToken,
		stakingToken,
		externalRewardsToken,
		stakingRewards,
        owner,
        accounts;

	const DAY = 86400;
	const ZERO_BN = toBN(0);

	beforeEach(async () => {
        rewardsToken = await ethers.deployContract("OONE");
        await rewardsToken.waitForDeployment();
        
        externalRewardsToken = await ethers.deployContract("OONE");
        await externalRewardsToken.waitForDeployment();

        stakingToken = await ethers.deployContract("OONE");
        await stakingToken.waitForDeployment();

        accounts = [(await ethers.provider.getSigner(0)).address, (await ethers.provider.getSigner(1)).address, (await ethers.provider.getSigner(2)).address];
        owner = accounts[0];

        const StakingRewards  = await ethers.getContractFactory("StakingRewards");
		stakingRewards = await await upgrades.deployProxy(StakingRewards, [owner, rewardsToken.target, stakingToken.target], {
            initializer: "initialize",
        });
		await stakingRewards.grantRole(await stakingRewards.START_STAKING_ROLE(), owner);
	});

	it('ensure only known functions are mutative', async () => {
		await ensureOnlyExpectedMutativeFunctions({
			abi: (await artifacts.readArtifact('StakingRewards')).abi,
			ignoreParents: ['UUPSUpgradeable', 'ReentrancyGuardUpgradeable', 'AccessControlUpgradeable'],
			expected: [
                'initialize',
				'stake',
				'withdraw',
				'exit',
				'getReward',
				'notifyRewardAmount',
				'setPaused',
				'setRewardsDuration',
				'recoverERC20'
			],
		});
	});

	describe('Constructor & Settings', () => {
		it('should set rewards token on constructor', async () => {
			assert.equal(await stakingRewards.rewardsToken(), rewardsToken.target);
		});

		it('should staking token on constructor', async () => {
			assert.equal(await stakingRewards.stakingToken(), stakingToken.target);
		});

		it('should set owner on constructor', async () => {
			assert.equal(await stakingRewards.hasRole(await stakingRewards.DEFAULT_ADMIN_ROLE(), owner), true);
		});
	});

	describe('Function permissions', () => {
		const rewardValue = toUnit(1);

		beforeEach(async () => {
			await rewardsToken.approve(stakingRewards.target, rewardValue, { from: owner });
			await stakingRewards.revokeRole(await stakingRewards.START_STAKING_ROLE(), owner);
            await stakingRewards.revokeRole(await stakingRewards.DEFAULT_ADMIN_ROLE(), owner);
		});

		it('only owner can call notifyRewardAmount', async () => {
            await expect(stakingRewards.notifyRewardAmount(rewardValue))
                .to.revertedWithCustomError(stakingRewards, 'AccessControlUnauthorizedAccount');
		});

		it('only owner address can call setRewardsDuration', async () => {
			await time.increase(DAY * 30);
            await expect(stakingRewards.setRewardsDuration(70))
                .to.revertedWithCustomError(stakingRewards, 'AccessControlUnauthorizedAccount');
		});

		it('only owner address can call setPaused', async () => {
            await expect(stakingRewards.setPaused(true))
                .to.revertedWithCustomError(stakingRewards, 'AccessControlUnauthorizedAccount');
		});
	});

	describe('Pausable', async () => {
		beforeEach(async () => {
			await stakingRewards.setPaused(true, { from: owner });
		});
		it('should revert calling stake() when paused', async () => {
			const totalToStake = toUnit(100);
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });

			await expect(
				stakingRewards.stake(totalToStake, { from: owner })
            ).to.be.revertedWithCustomError(stakingRewards, 'EnforcedPause');
		});
		it('should not revert calling stake() when unpaused', async () => {
			await stakingRewards.setPaused(false, { from: owner });

			const totalToStake = toUnit('100');
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });

			await stakingRewards.stake(totalToStake, { from: owner });
		});
	});

	describe('External Rewards Recovery', () => {
		const amount = toUnit(5000);
		beforeEach(async () => {
			// Send ERC20 to StakingRewards Contract
			await externalRewardsToken.transfer(stakingRewards.target, amount, { from: owner });
			assert.equal(await externalRewardsToken.balanceOf(stakingRewards.target), amount);
		});
		it('only owner can call recoverERC20', async () => {
            await stakingRewards.revokeRole(await stakingRewards.DEFAULT_ADMIN_ROLE(), owner);
            await expect(stakingRewards.recoverERC20(externalRewardsToken.target, amount))
                .to.revertedWithCustomError(stakingRewards, 'AccessControlUnauthorizedAccount');
		});
		it('should revert if recovering staking token', async () => {
			await expect(stakingRewards.recoverERC20(stakingToken.target, amount, {
                from: owner,
			})).to.revertedWith(
			    'Cannot withdraw the staking token'
			);
		});
		it('should retrieve external token from StakingRewards and reduce contracts balance', async () => {
			await stakingRewards.recoverERC20(externalRewardsToken.target, amount, {
				from: owner,
			});
			assert.equal(await externalRewardsToken.balanceOf(stakingRewards.target), ZERO_BN);
		});
		it('should retrieve external token from StakingRewards and increase owners balance', async () => {
			const ownerMOARBalanceBefore = await externalRewardsToken.balanceOf(owner);

			await stakingRewards.recoverERC20(externalRewardsToken.target, amount, {
				from: owner,
			});

			const ownerMOARBalanceAfter = await externalRewardsToken.balanceOf(owner);
			assert.equal(ownerMOARBalanceAfter - ownerMOARBalanceBefore, amount);
		});
		it('should emit Recovered event', async () => {
            await expect(await stakingRewards.recoverERC20(externalRewardsToken.target, amount, { from: owner }))
                .to.emit(stakingRewards, 'Recovered')
                .withArgs(externalRewardsToken.target, amount);
		});
	});

	describe('lastTimeRewardApplicable()', () => {
		it('should return 0', async () => {
			assert.equal(await stakingRewards.lastTimeRewardApplicable(), ZERO_BN);
		});

		describe('when updated', () => {
			it('should equal current timestamp', async () => {
                await rewardsToken.approve(stakingRewards.target, toUnit(1.0), { from: owner });
				await stakingRewards.notifyRewardAmount(toUnit(1.0), {
					from: owner,
				});

				const cur = await currentTime();
				const lastTimeReward = await stakingRewards.lastTimeRewardApplicable();

				assert.equal(cur.toString(), lastTimeReward.toString());
			});
		});
	});

	describe('rewardPerToken()', () => {
		it('should return 0', async () => {
			assert.equal(await stakingRewards.rewardPerToken(), ZERO_BN);
		});

		it('should be > 0', async () => {
			const totalToStake = toUnit('100');
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			const totalSupply = await stakingRewards.totalSupply();
			assert.equal(totalSupply > ZERO_BN, true);

			const rewardValue = toUnit(5000.0);
			await rewardsToken.approve(stakingRewards.target, rewardValue, { from: owner });
			await stakingRewards.notifyRewardAmount(rewardValue, {
				from: owner,
			});

			await time.increase(DAY);

			const rewardPerToken = await stakingRewards.rewardPerToken();
			assert.equal(rewardPerToken > ZERO_BN, true);
		});
	});

	describe('stake()', () => {
		it('staking increases staking balance', async () => {
			const totalToStake = toUnit('100');
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });

			const initialStakeBal = await stakingRewards.balanceOf(owner);
			const initialLpBal = await stakingToken.balanceOf(owner);

			await stakingRewards.stake(totalToStake, { from: owner });

			const postStakeBal = await stakingRewards.balanceOf(owner);
			const postLpBal = await stakingToken.balanceOf(owner);

			assert.equal(postLpBal < initialLpBal, true);
			assert.equal(postStakeBal > initialStakeBal, true);
		});

		it('cannot stake 0', async () => {
			await expect(stakingRewards.stake('0')).to.revertedWith('Cannot stake 0');
		});
	});

	describe('earned()', () => {
		it('should be 0 when not staking', async () => {
			assert.equal(await stakingRewards.earned(owner), ZERO_BN);
		});

		it('should be > 0 when staking', async () => {
			const totalToStake = toUnit('100');
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			const rewardValue = toUnit(5000.0);
			await rewardsToken.approve(stakingRewards.target, rewardValue, { from: owner });
			await stakingRewards.notifyRewardAmount(rewardValue, {
				from: owner,
			});

			await time.increase(DAY);

			const earned = await stakingRewards.earned(owner);

			assert.equal(earned > ZERO_BN, true);
		});

		it('rewardRate should increase if new rewards come before DURATION ends', async () => {
			const totalToDistribute = toUnit('5000');

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			const rewardRateInitial = await stakingRewards.rewardRate();

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			const rewardRateLater = await stakingRewards.rewardRate();

			assert.equal(rewardRateInitial > ZERO_BN, true);
			assert.equal(rewardRateLater > rewardRateInitial, true);
		});

		it('rewards token balance should rollover after DURATION', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY * 30);
			const earnedFirst = await stakingRewards.earned(owner);

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY * 30);
			const earnedSecond = await stakingRewards.earned(owner);

			assert.equal(earnedSecond, earnedFirst + earnedFirst);
		});
	});

	describe('getReward()', () => {
		it('should increase rewards token balance', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY);

			const initialRewardBal = await rewardsToken.balanceOf(owner);
			const initialEarnedBal = await stakingRewards.earned(owner);
			await stakingRewards.getReward({ from: owner });
			const postRewardBal = await rewardsToken.balanceOf(owner);
			const postEarnedBal = await stakingRewards.earned(owner);

			assert.equal(postEarnedBal < initialEarnedBal, true);
			assert.equal(postRewardBal > initialRewardBal, true);
		});
	});

	describe('setRewardsDuration()', () => {
		const thirtyDays = DAY * 30;
		const seventyDays = DAY * 70;
		it('should increase rewards duration before starting distribution', async () => {
			const defaultDuration = await stakingRewards.rewardsDuration();
			assert.equal(defaultDuration, thirtyDays);

			await stakingRewards.setRewardsDuration(seventyDays, { from: owner });
			const newDuration = await stakingRewards.rewardsDuration();
			assert.equal(newDuration, seventyDays);
		});
		it('should revert when setting setRewardsDuration before the period has finished', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY);

			await expect(
				stakingRewards.setRewardsDuration(seventyDays, { from: owner })
            ).to.revertedWith(
				'Previous rewards period must be complete before changing the duration for the new period'
			);
		});
		it('should update when setting setRewardsDuration after the period has finished', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY * 31);

			await expect(stakingRewards.setRewardsDuration(seventyDays, { from: owner }))
                .to.emit(stakingRewards, 'RewardsDurationUpdated')
                .withArgs(seventyDays);

			const newDuration = await stakingRewards.rewardsDuration();
			assert.equal(newDuration, seventyDays);

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});
		});

		it('should update when setting setRewardsDuration after the period has finished', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY * 16);
			await stakingRewards.getReward({ from: owner });
			await time.increase(DAY * 15);

			// New Rewards period much lower
			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await expect(stakingRewards.setRewardsDuration(seventyDays, { from: owner }))
                .to.emit(stakingRewards, 'RewardsDurationUpdated')
                .withArgs(seventyDays);

			const newDuration = await stakingRewards.rewardsDuration();
			assert.equal(newDuration, seventyDays);

			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			await time.increase(DAY * 71);
			await stakingRewards.getReward({ from: owner });
		});
	});

	describe('getRewardForDuration()', () => {
		it('should increase rewards token balance', async () => {
			const totalToDistribute = toUnit('5000');
			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			const rewardForDuration = await stakingRewards.getRewardForDuration();

			const duration = await stakingRewards.rewardsDuration();
			const rewardRate = await stakingRewards.rewardRate();

			assert.equal(rewardForDuration > ZERO_BN, true);
			assert.equal(rewardForDuration, duration * rewardRate);
		});
	});

	describe('withdraw()', () => {
		it('cannot withdraw if nothing staked', async () => {
			await expect(stakingRewards.withdraw(toUnit('100'))).to.reverted;
		});

		it('should increases lp token balance and decreases staking balance', async () => {
			const totalToStake = toUnit('100');
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			const initialStakingTokenBal = await stakingToken.balanceOf(owner);
			const initialStakeBal = await stakingRewards.balanceOf(owner);

			await stakingRewards.withdraw(totalToStake, { from: owner });

			const postStakingTokenBal = await stakingToken.balanceOf(owner);
			const postStakeBal = await stakingRewards.balanceOf(owner);

			assert.equal(postStakeBal + totalToStake, initialStakeBal);
			assert.equal(initialStakingTokenBal + totalToStake, postStakingTokenBal);
		});

		it('cannot withdraw 0', async () => {
			await expect(stakingRewards.withdraw('0')).to.revertedWith('Cannot withdraw 0');
		});
	});

	describe('exit()', () => {
		it('should retrieve all earned and increase rewards bal', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });
			await stakingRewards.notifyRewardAmount(toUnit(5000.0), {
				from: owner,
			});

			await time.increase(DAY);

			const initialRewardBal = await rewardsToken.balanceOf(owner);
			const initialEarnedBal = await stakingRewards.earned(owner);
			await stakingRewards.exit({ from: owner });
			const postRewardBal = await rewardsToken.balanceOf(owner);
			const postEarnedBal = await stakingRewards.earned(owner);

			assert.equal(postEarnedBal < initialEarnedBal, true);
			assert.equal(postRewardBal > initialRewardBal, true);
			assert.equal(postEarnedBal, ZERO_BN);
		});
	});

	describe('notifyRewardAmount()', () => {
		let localStakingRewards;

		before(async () => {
			rewardsTokenWithoutTransfer = await ethers.deployContract("RewardsTokenWithoutTransfer");
       		await rewardsTokenWithoutTransfer.waitForDeployment();
            
			const StakingRewards  = await ethers.getContractFactory("StakingRewards");
            localStakingRewards = await await upgrades.deployProxy(StakingRewards, [owner, rewardsTokenWithoutTransfer.target, stakingToken.target], {
                initializer: "initialize",
            });
			await localStakingRewards.grantRole(await localStakingRewards.START_STAKING_ROLE(), owner);
		});

		it('Reverts if the provided reward is greater than the balance.', async () => {
			const rewardValue = toUnit(1000);
			await rewardsTokenWithoutTransfer.approve(localStakingRewards.target, rewardValue, { from: owner });
			await expect(localStakingRewards.notifyRewardAmount(rewardValue + toUnit(1), { from: owner }))
                .to.revertedWith('Provided reward too high');
		});

		it('Reverts if the provided reward is greater than the balance, plus rolled-over balance.', async () => {
			const rewardValue = toUnit(1000);
			await rewardsTokenWithoutTransfer.approve(localStakingRewards.target, rewardValue, { from: owner });
			localStakingRewards.notifyRewardAmount(rewardValue, {
				from: owner,
			});
			await rewardsToken.approve(localStakingRewards.target, rewardValue, { from: owner });
			// Now take into account any leftover quantity.
            await expect(localStakingRewards.notifyRewardAmount(rewardValue + toUnit(1), { from: owner }))
                .to.revertedWith('Provided reward too high');
		});
	});

	describe('Integration Tests', () => {
		it('stake and claim', async () => {
			// Transfer some LP Tokens to user
			const totalToStake = toUnit('500');

			// Stake LP Tokens
			await stakingToken.approve(stakingRewards.target, totalToStake, { from: owner });
			await stakingRewards.stake(totalToStake, { from: owner });

			// Distribute some rewards
			const totalToDistribute = toUnit('35000');

			// Transfer Rewards to the RewardsDistribution contract address
			await rewardsToken.approve(stakingRewards.target, totalToDistribute, { from: owner });

			// Distribute Rewards called from Synthetix contract as the authority to distribute
			await stakingRewards.notifyRewardAmount(totalToDistribute, {
				from: owner,
			});

			// Period finish should be ~30 days from now
			const periodFinish = await stakingRewards.periodFinish();
			const curTimestamp = await currentTime();
			assert.equal(parseInt(periodFinish.toString(), 10), curTimestamp + DAY * 30);

			// Reward duration is 30 days, so we'll
			// time.increase time by 6 days to prevent expiration
			await time.increase(DAY * 6);

			// Reward rate and reward per token
			const rewardRate = await stakingRewards.rewardRate();
			assert.equal(rewardRate > ZERO_BN, true);

			const rewardPerToken = await stakingRewards.rewardPerToken();
			assert.equal(rewardPerToken > ZERO_BN, true);

			// Make sure we earned in proportion to reward per token
			const rewardRewardsEarned = await stakingRewards.earned(owner);
			assert.equal(rewardRewardsEarned, rewardPerToken * totalToStake / toUnit(1));

			// Make sure after withdrawing, we still have the ~amount of rewardRewards
			// The two values will be a bit different as time has "passed"
			const initialWithdraw = toUnit('100');
            const stakingTokenBefore = await stakingToken.balanceOf(owner);
			await stakingRewards.withdraw(initialWithdraw, { from: owner });
            const stakingTokenAfter = await stakingToken.balanceOf(owner)
			assert.equal(initialWithdraw, stakingTokenAfter - stakingTokenBefore);

			const rewardRewardsEarnedPostWithdraw = await stakingRewards.earned(owner);
			assert.equal(rewardRewardsEarned >= rewardRewardsEarnedPostWithdraw - 10n ** 17n, true);
            assert.equal(rewardRewardsEarned <= rewardRewardsEarnedPostWithdraw + 10n ** 17n, true);

			// Get rewards
			const initialRewardBal = await rewardsToken.balanceOf(owner);
			await stakingRewards.getReward({ from: owner });
			const postRewardRewardBal = await rewardsToken.balanceOf(owner);

			assert.equal(postRewardRewardBal > initialRewardBal, true);

			// Exit
			const preExitLPBal = await stakingToken.balanceOf(owner);
			await stakingRewards.exit({ from: owner });
			const postExitLPBal = await stakingToken.balanceOf(owner);
			assert.equal(postExitLPBal > preExitLPBal, true);
		});
	});
});
