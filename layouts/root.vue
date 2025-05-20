<template>
  <div class="relative min-h-screen">
    <Logo initials="phj" logo_path="/logo.png" :p_easter_egg="false" />
    <div class="flex flex-col justify-center align-center m-auto max-w-[700px] relative z-10 px-4 md:px-0">
      <div class="text-white md:p-4 rounded">
        <Header class="mb-4" />
        <main class="flex-grow">
          <slot />
        </main>
      </div>
      <Footer class="footer" />
    </div>
  </div>
</template>
<script setup lang="ts"></script>
<style>
/* .footer {
  position: fixed;
  left: 0;
  bottom: 0;
  max-width: 700px;
  color: white;
} */
</style>
