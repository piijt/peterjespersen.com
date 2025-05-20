<template>
  <div class="relative min-h-screen flex flex-col">
    <Logo initials="phj" logo_path="/logo.png" :p_easter_egg="false" />
    <div
      class="flex flex-col justify-center align-center m-auto max-w-[700px] relative z-10 px-4 md:px-0 flex-grow"
    >
      <div class="text-white md:p-4 rounded">
        <Header class="mb-4" />
        <main class="flex-grow">
          <slot />
        </main>
      </div>
    </div>
    <Footer class="footer" />
  </div>
</template>
<script setup lang="ts"></script>
<style>
.footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 700px;
  margin: 0 auto;
  color: white;
  background-color: #16161d;
  z-index: 10;
}
</style>
