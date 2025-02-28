<template>
  <div class="text-sm flex flex-col pt-2">
    <p>Education</p>
    <div class="pt-2" v-for="item in entries">
      <div class="flex flex-col gap-x-2">
        <span class="primary">
          {{ item.school.title }}
        </span>
        <span>
          {{ item.title }}
        </span>
      </div>
      <span class="flex flex-row gap-x-2 m-auto text-gray-500 text-xs pt-1">
        · {{ item.duration }}
      </span>
      <span class="flex flex-row gap-x-2 m-auto text-gray-500 text-xs pt-1">
        · {{ item.location }}
      </span>
      <div class="flex flex-row gap-x-2 pt-1 align-end">
        <p class="text-xs">Skills:</p>
        <span class="text-gray-500 text-xs" v-for="s in item.skills"
          >· {{ s }}</span
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const entries = ref([
  {
    title: "Bachelor, Web Development",
    location: "Denmark, Kolding",
    school: {
      title: "International Business College, Kolding",
    },
    duration: "2018-2020",
    skills: [
      "Objective Programming",
      "Data Structures",
      "Algorithms",
      "Blockchain Technologies",
    ],
  },
  {
    title: "AP Degree, Multimedia Design",
    location: "Denmark, Kolding",
    school: {
      title: "International Business College, Kolding",
    },
    duration: "2016-2018",
    skills: ["PhP", "Adobe CC", "Photoshop", "Node.js", "Project Planning"],
  },
]);
</script>
