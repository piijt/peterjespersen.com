export type employment_entry = {
  website: string;
  role: string;
  company: string;
  start_date: Date;
  end_date: Date | null;
  current?: boolean;
  tldr: string;
  tech: string[];
};

export const useWorkHistory = () => {
  const hiddenChar = "\u200B";
  const employment_history = ref<employment_entry[]>([
    {
      website: "https://makin3d.com",
      role: "Software Developer",
      company: "Kinematic",
      start_date: new Date("2023-12-01"),
      end_date: null,
      current: true,
      tldr: `At Kinematic, I develop and maintain software solutions in C++, C#, and Nuxt.js for the construction industry${hiddenChar}. My role involves building new features and optimizing existing functionalities to enhance user experience and efficiency in our products.`,
      tech: [
        "https://img.shields.io/badge/Kubernetes-282C34?style=for-the-badge&logo=kubernetes&logoColor=white",
        "https://img.shields.io/badge/Nuxt.js-282C34?style=for-the-badge&logo=nuxtdotjs&logoColor=white",
        "https://img.shields.io/badge/C%2B%2B-282C34?style=for-the-badge&logo=cplusplus&logoColor=white",
        "https://img.shields.io/badge/TypeScript-282C34?logo=typescript&style=for-the-badge&link=",
        "https://img.shields.io/badge/Digital_Ocean-282C34?style=for-the-badge&logo=digitalocean&logoColor=white",
        "https://img.shields.io/badge/Node.js-282C34?logo=nodedotjs&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
        "https://img.shields.io/badge/MySQL-282C34?logo=mysql&style=for-the-badge&logoColor=white&link=https://github.com/piijt?tab=repositories&q=mysql&type=&language=&sort=",
      ],
    },
    {
      website: "https://trade-raid.com",
      role: "Fullstack Developer",
      company: "Trade-Raid.com",
      start_date: new Date("2022-08-01"),
      end_date: new Date("2023-11-30"),
      tldr: `As a Fullstack Developer, I was responsible for refactoring the backend from a PHP codebase to Node.js, significantly improving performance and maintainability${hiddenChar}. Trade-Raid.com enables gamers to trade digital assets across different games, helping them save money by avoiding duplicate purchases.`,
      tech: [
        "https://img.shields.io/badge/Nuxt.js-282C34?style=for-the-badge&logo=nuxtdotjs&logoColor=white",
        "https://img.shields.io/badge/AWS-282C34?style=for-the-badge&logo=amazonaws&logoColor=white",
        "https://img.shields.io/badge/TypeScript-282C34?logo=typescript&style=for-the-badge&link=",
        "https://img.shields.io/badge/PhP-282C34?logo=php&style=for-the-badge&link=",
        "https://img.shields.io/badge/Express-282C34?logo=express&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
        "https://img.shields.io/badge/Node.js-282C34?logo=nodedotjs&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
        "https://img.shields.io/badge/MongoDB-282C34?logo=mongodb&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=mongodb&type=&language=&sort=",
        "https://img.shields.io/badge/Laravel-282C34?style=for-the-badge&logo=laravel&logoColor=white",
        "https://img.shields.io/badge/PostgreSQL-282C34?style=for-the-badge&logo=postgresql&logoColor=white",
      ],
    },
    {
      website: "https://cavea.io",
      role: "Software Developer",
      company: "Cavea.io",
      start_date: new Date("2020-03-01"),
      end_date: new Date("2022-09-30"),
      tldr: `At Cavea.io, I focused on backend development and DevOps, working with GCP and Node.js to build and deploy APIs, microservices, and ETL pipelines${hiddenChar}. My contributions enhanced scalability and data processing efficiency.`,
      tech: [
        "https://img.shields.io/badge/Kubernetes-282C34?style=for-the-badge&logo=kubernetes&logoColor=white",
        "https://img.shields.io/badge/Vue.js-282C34?logo=vuedotjs&style=for-the-badge",
        "https://img.shields.io/badge/TypeScript-282C34?logo=typescript&style=for-the-badge&link=",
        "https://img.shields.io/badge/Google_Cloud-282C34?style=for-the-badge&logo=google-cloud&logoColor=white",
        "https://img.shields.io/badge/Node.js-282C34?logo=nodedotjs&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
        "https://img.shields.io/badge/NestJS-282C34?style=for-the-badge&logo=nestjs&logoColor=white",
        "https://img.shields.io/badge/Express-282C34?logo=express&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=&type=&language=javascript&sort=",
        "https://img.shields.io/badge/MongoDB-282C34?logo=mongodb&style=for-the-badge&link=https://github.com/piijt?tab=repositories&q=mongodb&type=&language=&sort=",
        "https://img.shields.io/badge/PostgreSQL-282C34?style=for-the-badge&logo=postgresql&logoColor=white",
      ],
    },
  ]);

  function formatEmploymentHistory(entry: employment_entry): string {
    const formatDate = (date: Date): string => {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
      };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    };

    const today = entry.current ? new Date() : entry.end_date!;
    const startDateFormatted = formatDate(entry.start_date);
    const endDateFormatted = entry.end_date
      ? formatDate(entry.end_date)
      : "Today";

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

    let durationFormatted = "";
    if (years > 0) {
      durationFormatted += `${years} year${years !== 1 ? "s" : ""}`;
    }
    if (adjustedMonths > 0) {
      durationFormatted += ` ${adjustedMonths} month${adjustedMonths !== 1 ? "s" : ""}`;
    }

    return `${startDateFormatted} - ${endDateFormatted} · ${durationFormatted}`;
  }
  return { formatEmploymentHistory, employment_history, hiddenChar };
};
