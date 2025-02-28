<template>
  <ul
    class="flex flex-row space-x-2 bg-primary rounded justify-center align-center"
  >
    <NavigationItem
      class="mt-auto"
      v-for="entry in items"
      :to="entry.path"
      :text="entry.text"
    />
  </ul>
</template>

<script setup lang="ts">
const items = ref([
  {
    text: "/",
    path: "/",
    custom__class: "text-xss",
  },
  {
    text: "resume",
    path: "/resume",
  },
  // {
  //     text: "projects",
  //     path: "/projects",
  // },
  // {
  //     text: "blog",
  //     path: "/blog",
  // },
]);
</script>
