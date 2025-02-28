<template>
  <NuxtLink
    class="cursor hover:text-[#3cf0b9;]"
    exact-active-class="text-[#3cf0b9;]"
    :class="custom__class"
    :to="to"
    :target="_target"
  >
    {{ text }}
  </NuxtLink>
</template>

<script lang="ts" setup>
const props = defineProps<{
  text?: string;
  to: string;
  target?: string;
  custom__class?: string;
}>();
// const route = useRoute();

const _target = computed(() => {
  return props?.target ?? null;
});
</script>
