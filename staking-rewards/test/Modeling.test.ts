const { assert, expect } = require("chai");
const { artifacts } = require("hardhat");
const { toBN } = require('web3-utils');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('Modeling APY', () => {
    const STAKERS_COUNT = 20;
    const USERS_COUNT = 4000;
    const MONTHS_COUNT = 6;

    const DAY = 86400;

    let stakers,
        monthlyStakes,
        monthlyRewards,
        rewardsToken,
        stakingRewards;

    async function initStakers() {
        stakers = [];

        for (let i = 0; i < STAKERS_COUNT; i++) {
            stakers.push({
                account: await ethers.provider.getSigner(i),
                staked: 0n,
                earned: 0n,
            });

            await rewardsToken.transfer(stakers[i].account.address, 1_000_000n * 10n ** 18n);
        }
    }

    function initMonthlyStakes() {
        monthlyStakes = {};

        let dayForStaker = Array.from({length: STAKERS_COUNT}, () => Math.floor(Math.random() * 30 + 1));
        for (let i = 0; i < dayForStaker.length; i++) {
            if (!monthlyStakes[dayForStaker[i]]) {
                monthlyStakes[dayForStaker[i]] = [];
            }
            monthlyStakes[dayForStaker[i]].push(i);
        }
    }

    function initMonthlyRewards() {
        monthlyRewards = {};

        let dayForUser = Array.from({length: USERS_COUNT}, () => Math.floor(Math.random() * 30 + 1));
        for (let i = 0; i < dayForUser.length; i++) {
            if (!monthlyRewards[dayForUser[i]]) {
                monthlyRewards[dayForUser[i]] = 0;
            }
            monthlyRewards[dayForUser[i]]++;
        }
    }

    async function stake(day) {
        if (monthlyStakes[day]) {
            await Promise.all(monthlyStakes[day].map(async (i) => {
                const staker = stakers[i];
                const stakeAmount = BigInt(Math.floor(Math.random() * 32 * 10 ** 18 + 8 * 10 ** 18));

                await rewardsToken.connect(staker.account).approve(stakingRewards.target, stakeAmount);
                await stakingRewards.connect(staker.account).stake(stakeAmount);

                staker.staked += stakeAmount;
            }));
        }
    }

    async function addRewards(day) {
        if (monthlyRewards[day]) {
            const rewards = Array.from({length: monthlyRewards[day]}, () => Math.floor(Math.random() * 4 * 10 ** 18 + 4 * 10 ** 18));
            const rewardsAmount = BigInt(rewards.reduce((partialSum, a) => partialSum + a, 0));

            await rewardsToken.transfer(stakingRewards.target, rewardsAmount);
            await stakingRewards.notifyRewardAmount(rewardsAmount);

            console.log('Rewards', rewardsAmount / 10n ** 18n);
        }
    }

    async function getRewards() {
        await Promise.all(stakers.map(async (staker) => {
            staker.earned = await stakingRewards.earned(staker.account.address);
        }));
    }

    before(async () => {
        rewardsToken = await ethers.deployContract("OONE");
        await rewardsToken.waitForDeployment();

        const owner = (await ethers.provider.getSigner(0)).address;

        const StakingRewards  = await ethers.getContractFactory("StakingRewards");
        stakingRewards = await await upgrades.deployProxy(StakingRewards, [owner, rewardsToken.target, rewardsToken.target], {
            initializer: "initialize",
        });
        await stakingRewards.grantRole(await stakingRewards.START_STAKING_ROLE(), owner);
    });

    it('modeling', async () => {
        await initStakers();

        for (let month = 0; month < MONTHS_COUNT; month++) {
            initMonthlyStakes();
            initMonthlyRewards();

            for (let day = 1; day <= 30; day++) {
                await stake(day);
                await addRewards(day);
                await getRewards();

                await time.increase(DAY);

                const total = stakers.reduce((total, staker) => {
                    total.totalStaked += staker.staked;
                    total.totalEarned += staker.earned;
                    return total;
                }, {totalStaked: 0n, totalEarned: 0n});
                total.totalStaked /= 10n ** 18n;
                total.totalEarned /= 10n ** 18n;
                console.log('Day', day,
                            'Staked', total.totalStaked,
                            'Earned', total.totalEarned,
                            'APY', Number(total.totalEarned)/Number(total.totalStaked)*100, '%',
                );
            }
        }
    });
});
