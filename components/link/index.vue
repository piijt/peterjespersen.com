<template>
  <NuxtLink class="primary cursor-pointer text-sm" :to="href" :target="target">
    {{ text }}
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string;
  target: string;
  icon: string;
  href: string;
}>();
const { text, target, icon, href } = props;
</script>
