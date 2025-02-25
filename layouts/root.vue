<template>
    <div>
        <Logo initials="phj" logo_path="/logo.png" :p_easter_egg="true" />
        <Header></Header>
        <div class="flex flex-col justify-center align-center m-auto max-w-[500px]">
            <SocialLinks class="flex space-y-2" />
            <!-- <Seperator /> -->
            <slot />
        </div>
    </div>
</template>
<script setup lang="ts"></script>
<style>

</style>