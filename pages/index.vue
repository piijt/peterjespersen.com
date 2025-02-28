<template>
  <div>
    <About />
    <img src="/images/isometric laptop_blackbg.png" />
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
