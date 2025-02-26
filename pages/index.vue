<template>
  <div class="text-white bg-primary md:p-4 rounded">
    <SocialLinks class="flex space-y-2" />
    <About />
    <Seperator />
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: "root",
});

useHead({
  title: "Peter Jespersen",
});

useSeoMeta({
  description:
    "Hey, I'm Peter Jespersen. Software developer from Denmark, passionate about programming and always eager to learn something new.",
});
</script>
