<template>
  <ul class="space-x-2">
    <NuxtLink
      class="text-gray-300 hover:text-gray-400 cursor-pointer text-sm flex flex-row justify-center align-center"
      to="https://github.com/piijt"
      target="_blank"
    >
      <LazyIconGithub />
    </NuxtLink>
    <NuxtLink
      class="text-gray-300 hover:text-gray-400 cursor-pointer text-sm flex flex-row"
      to="https://www.linkedin.com/in/peter-h%C3%B8jer-jespersen-630037107/"
      target="_blank"
    >
      <LazyIconLinkedin />
    </NuxtLink>
  </ul>
</template>
<script lang="ts" setup>
import { IconLinkedin } from "#components";
</script>
