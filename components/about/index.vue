<template>
    <div>
        <h1 class="font-bold space-x-2 py-4"><span class="primary cursor-pointer">Hi</span>, I'm Peter👋</h1>
        <p class="space-x-2 pb-2">🌍 Denmark, Odense</p>
        <p class="space-x-2 pb-4">Software Developer, with expertise in system design & microservices. Thorough and
            curious by nature who loves to build full-stack projects.</p>
        <p>Employment History</p>
        <div class="text-sm">
            <div class="space-x-2 flex flex-col mt-2 pb-2" v-for="entry in employment_history">
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
                    <div class=" pt-2 flex flex-row gap-2 flex-wrap">
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
        brief: "At Kinematic, I develop and maintain software solutions in C++, C#, and Nuxt.js for the construction industry. My role involves building new features and optimizing existing functionalities to enhance user experience and efficiency.",
        tech: [
            "https://img.shields.io/badge/Kubernetes-282C34?style=for-the-badge&logo=kubernetes&logoColor=white",
            "https://img.shields.io/badge/Nuxt.js-282C34?style=for-the-badge&logo=nuxtdotjs&logoColor=white",
            "https://img.shields.io/badge/C%2B%2B-282C34?style=for-the-badge&logo=cplusplus&logoColor=white",
            "https://img.shields.io/badge/TypeScript-282C34?logo=typescript&style=for-the-badge&link=",
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
        brief: "As a Fullstack Developer, I was responsible for refactoring the backend from a PHP codebase to Node.js, significantly improving performance and maintainability. Trade-Raid.com enables gamers to trade digital assets across different games, helping them save money by avoiding duplicate purchases.",
        tech: [
            "https://img.shields.io/badge/Nuxt.js-282C34?style=for-the-badge&logo=nuxtdotjs&logoColor=white",
            "https://img.shields.io/badge/AWS-282C34?style=for-the-badge&logo=amazonaws&logoColor=white",
            "https://img.shields.io/badge/TypeScript-282C34?logo=typescript&style=for-the-badge&link=",
            "https://img.shields.io/badge/PhP-282C34?logo=php&style=for-the-badge&link=",
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
        brief: "At Cavea.io, I focused on backend development and DevOps, working with GCP and Node.js to build and deploy APIs, microservices, and ETL pipelines. My contributions enhanced scalability and data processing efficiency.",
        tech: [
            "https://img.shields.io/badge/Kubernetes-282C34?style=for-the-badge&logo=kubernetes&logoColor=white",
            "https://img.shields.io/badge/Vue.js-282C34?logo=vuedotjs&style=for-the-badge",
            "https://img.shields.io/badge/TypeScript-282C34?logo=typescript&style=for-the-badge&link=",
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
        brief: "Worked on an e-business concept aimed at helping engineers optimize Alfa Laval's products, reducing manufacturing costs and CO2 emissions across multiple industries.",
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