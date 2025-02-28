<template>
  <ul class="space-x-2 flex flex-row">
    <NuxtLink
      class="text-gray-300 cursor-pointer text-sm flex flex-row justify-center align-center hover:text-[#3cf0b9;]"
      to="https://github.com/piijt"
      target="_blank"
    >
      <LazyIconGithub :size="size || 24" />
    </NuxtLink>
    <NuxtLink
      class="text-gray-300 hover:text-[#3cf0b9;] cursor-pointer text-sm flex flex-row"
      to="https://www.linkedin.com/in/peter-h%C3%B8jer-jespersen-630037107/"
      target="_blank"
    >
      <LazyIconLinkedin :size="size || 24" />
    </NuxtLink>
  </ul>
</template>
<script lang="ts" setup>
defineProps<{ size?: number }>();
</script>
