<template>
  <div>
    <h1 class="font-bold space-x-2 py-4 flex flex-row">
      <span class="primary cursor-pointer">Hi</span>, I'm Peter👋
    </h1>
    <p class="space-x-2 pb-4 text-sm">
      I'm a passionate <strong>Software Developer</strong> with a deep focus on
      <strong>system design</strong> and
      <strong>microservices architecture</strong>. I love turning ideas into
      scalable, efficient solutions and building
      <strong>full-stack projects</strong> that are not only functional but also
      optimized for performance and user experience.
    </p>
    <p class="space-x-2 pb-4 text-sm">
      I enjoy tackling complex challenges, and I'm always curious to learn about
      new technologies and approaches. Whether it's building robust backend
      services or crafting beautiful, intuitive frontends, I'm driven by the
      opportunity to create impactful software.
    </p>
    <p class="space-x-2 pb-4 text-sm">
      Currently, I specialize in technologies such as
      <strong>Vue 3, Nuxt.js, TypeScript, Node.js</strong>, and cloud services.
      I'm also always exploring new tools and trends in the software development
      world.
    </p>
    <p class="space-x-2 pb-4 text-sm">
      When I'm not coding, you can find me reading tech blogs or exploring new hobbies.<br> <span class="primary cursor-pointer" @click="mailTo">Feel free to get in touch to chat about potential collaborations. </span>
    </p>
  </div>
  <Seperator />
</template>

<script lang="ts" setup>
import { useUtility } from '~/composables/useUtility';

const {mailTo} = useUtility()
</script>
