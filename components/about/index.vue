<template>
    <div>
        <h1 class="font-bold space-x-2 py-4"><span class="primary cursor-pointer">Hi</span>, I'm Peter👋</h1>
        <p class="space-x-2 pb-2">🌍 Denmark, Odense</p>
        <p class="space-x-2 pb-2">Software Developer, with expertise in system design & microservices. Thorough and
            curious by nature who loves to build full-stack projects.</p>
        <p>Employment History</p>
        <div class="text-sm">
            <div class="space-x-2 flex flex-col mt-2" v-for="entry in employment_history">
                <NuxtLink class="primary" :to="entry.website" target="_blank">
                    <span class="flex flex-row gap-x-2 align-center justify-content m-auto">
                        {{ entry.role }} - {{ entry.company }}
                    </span>
                </NuxtLink>
                <div class="">
                    <span class="text-gray-300 text-xs pl-2 pt-1">
                        - {{ formatEmploymentHistory(entry) }}
                    </span>
                    <blockquote class="text-md text-gray-300 cursor-vertical-text pt-1">"{{ entry.brief }}"</blockquote>
                    <div class=" pt-2 px-2 flex flex-row gap-2 flex-wrap">
                        <img v-for="t in entry.tech" :src="t" style="height: 25px;">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

type employment_entry = {
    website: string;
    role: string;
    company: string;
    start_date: Date;
    end_date: Date | null;
    current?: boolean;
    brief: string;
    tech: string[];
}

const employment_history = ref<employment_entry[]>([
    {
        website: "https://kinematic.com",
        role: "Software Developer",
        company: "Kinematic",
        start_date: new Date('2023-12-01'),
        end_date: null,
        current: true,
        brief: "My day to day work consists of maintaining and building new features in C++ / C# and Nuxt, where we @Kinematic make awesome software for the construction business",
        tech: [
            "https://img.shields.io/badge/Kubernetes-282C34?style=for-the-badge&logo=kubernetes&logoColor=white",
            "https://img.shields.io/badge/Nuxt.js-282C34?style=for-the-badge&logo=nuxtdotjs&logoColor=white",
            "https://img.shields.io/badge/C%2B%2B-282C34?style=for-the-badge&logo=cplusplus&logoColor=white",
            "https://img.shields.io/badge/Digital_Ocean-282C34?style=for-the-badge&logo=digitalocean&logoColor=white",
            "https://img.shields.io/badge/Node.js-282C34?logo=nodedotjs&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
            "https://img.shields.io/badge/MySQL-282C34?logo=mysql&style=for-the-badge&logoColor=white&link=https://github.com/piijt?tab=repositories&q=mysql&type=&language=&sort=",
        ]
    },
    {
        website: "https://trade-raid.com",
        role: "Fullstack Developer",
        company: "Trade-Raid.com",
        start_date: new Date('2022-08-01'),
        end_date: new Date("2023-11-30"),
        brief: "I was working fullstack, and when I was brought in on this project refactored the backend from legacy PhP codebase to node.js. \n \n Trade-raid.com enables gamers to trade digital values across games, to save money and not swipe their credit card twice.",
        tech: [
            "https://img.shields.io/badge/Nuxt.js-282C34?style=for-the-badge&logo=nuxtdotjs&logoColor=white",
            "https://img.shields.io/badge/AWS-282C34?style=for-the-badge&logo=amazonaws&logoColor=white",
            "https://img.shields.io/badge/Express-282C34?logo=express&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
            "https://img.shields.io/badge/Node.js-282C34?logo=nodedotjs&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
            "https://img.shields.io/badge/MongoDB-282C34?logo=mongodb&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=mongodb&type=&language=&sort=",
            "https://img.shields.io/badge/Laravel-282C34?style=for-the-badge&logo=laravel&logoColor=white",
            "https://img.shields.io/badge/PostgreSQL-282C34?style=for-the-badge&logo=postgresql&logoColor=white"
        ]
    },
    {
        website: "https://cavea.io",
        role: "Software Developer",
        company: "Cavea.io",
        start_date: new Date('2020-03-01'),
        end_date: new Date("2022-09-30"),
        brief: "Primary focus on backend and DevOps, working with GCP and node.js to build and deploy API's, microservices & and ETL pipelines.",
        tech: [
            "https://img.shields.io/badge/Kubernetes-282C34?style=for-the-badge&logo=kubernetes&logoColor=white",
            "https://img.shields.io/badge/Vue.js-282C34?logo=vuedotjs&style=for-the-badge",
            "https://img.shields.io/badge/Google_Cloud-282C34?style=for-the-badge&logo=google-cloud&logoColor=white",
            "https://img.shields.io/badge/Node.js-282C34?logo=nodedotjs&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
            "https://img.shields.io/badge/NestJS-282C34?style=for-the-badge&logo=nestjs&logoColor=white",
            "https://img.shields.io/badge/Express-282C34?logo=express&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
            "https://img.shields.io/badge/MongoDB-282C34?logo=mongodb&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=mongodb&type=&language=&sort=",
            "https://img.shields.io/badge/PostgreSQL-282C34?style=for-the-badge&logo=postgresql&logoColor=white"
        ]

    },
    {
        website: "https://www.alfalaval.dk/",
        role: "Ebusiness Consultant",
        company: "Alfalaval",
        start_date: new Date('2018-09-01'),
        end_date: new Date("2019-08-01"),
        brief: "Working with an e-business concept to imrpove and enable engineers that used alfalaval's products around the world to save cost and reduce CO2 emission when manufacturing product-lines in several industries.",
        tech: []
    },
])

function formatEmploymentHistory(entry: employment_entry): string {
    const formatDate = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
        return new Intl.DateTimeFormat('en-US', options).format(date);
    };

    const today = entry.current ? new Date() : entry.end_date!;
    const startDateFormatted = formatDate(entry.start_date);
    const endDateFormatted = entry.end_date ? formatDate(entry.end_date) : "Today";

    const startDate = entry.start_date.getTime();
    const endDate = today.getTime();
    const durationInMs = endDate - startDate;
    const durationDate = new Date(durationInMs);

    const years = durationDate.getUTCFullYear() - 1970;
    const months = durationDate.getUTCMonth();

    let adjustedMonths = months;
    if (entry.current) {
        adjustedMonths += today.getMonth();
    }

    let durationFormatted = '';
    if (years > 0) {
        durationFormatted += `${years} year${years !== 1 ? 's' : ''}`;
    }
    if (adjustedMonths > 0) {
        durationFormatted += ` ${adjustedMonths} month${adjustedMonths !== 1 ? 's' : ''}`;
    }

    return `${startDateFormatted} - ${endDateFormatted} · ${durationFormatted}`;
}
</script>