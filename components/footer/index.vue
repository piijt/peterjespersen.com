<template>
  <div
    class="w-full rounded-lg text-white py-3 px-4 flex flex-row items-center text-xs space-x-2"
  >
    <div class="flex flex-row items-center space-x-2">
      <LazyIconMapPin :size="18" class="primary cursor-pointer" />
      <span>Denmark, Odense</span>
    </div>
    <div
      class="flex items-center space-x-2 cursor-pointer primary"
      @click="mailTo"
    >
      <LazyIconSend :size="18" class="primary cursor-pointer" />
      <span class="hover:underline !text-white">Get in Touch</span>
    </div>
    <SocialLinks class="ml-auto" :size="18" />
  </div>
</template>

<script lang="ts" setup>
import { useUtility } from '~/composables/useUtility';

const {mailTo} = useUtility()

</script>
