<template>
  <div class="cursor-pointer" id="logo" @click="router.push('/')">
    <img
      id="logoId"
      ref="logo"
      :src="logo_path"
      alt="logo"
      :style="{
        transform: `rotate(${rotation}deg)`,
        filter: `brightness(${brightness})`,
        opacity: opacity,
      }"
    />
    <div class="p-4" id="tag">
      <p class="space-x-2">
        <span>{{ v_location }}</span>
        <span @click="easterEgg = !easterEgg" class="primary" id="phj">{{
          initials
        }}</span>
      </p>
    </div>
  </div>
  <div
    v-if="easterEgg && p_easter_egg"
    class="text-white p-25 fixed flex flex-col text-sm"
  >
    <p class="flex flex-row">Scroll up</p>
    <p>
      Rotation:
      <span class="primary">
        {{ rotation }}
      </span>
    </p>
    <p>
      Opacity: <span class="primary">{{ opacity }}</span>
    </p>
    <p>
      Velocity: <span class="primary">{{ velocity }}</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

defineProps({
  initials: {
    type: String,
    required: true,
  },
  logo_path: {
    type: String,
    required: true,
  },
  p_easter_egg: {
    type: Boolean,
    default: false,
  },
});
const rotation = ref(-46);
const velocity = ref(0);
const friction = 0.92;
const maxRotation = 360;
const brightness = ref(1);
const opacity = ref(1);

const v_location = ref("");

const easterEgg = ref(false);
const handleScroll = (event: WheelEvent) => {
  const delta = event.deltaY > 0 ? 1 : -1;
  velocity.value += delta * 6;
  brightness.value = 1.8;
  opacity.value = 1.2;
};

const animate = () => {
  velocity.value *= friction;

  if (Math.abs(velocity.value) > 0.01) {
    rotation.value += velocity.value;
    if (rotation.value >= maxRotation || rotation.value <= -maxRotation) {
      rotation.value = 0;
    }
  }

  brightness.value = Math.max(1, brightness.value - 0.05);
  opacity.value = Math.max(1, opacity.value - 0.03);

  requestAnimationFrame(animate);
};

onMounted(() => {
  window.addEventListener("wheel", handleScroll);
  animate();
});

onUnmounted(() => {
  window.removeEventListener("wheel", handleScroll);
});

onBeforeMount(() => {
  v_location.value = window.location.host;
});
</script>

<style scoped>
div#logo img#logoId {
  position: absolute;
  top: -300px;
  left: -300px;
  width: 500px;
  height: auto;
  transition:
    filter 0.2s ease-out,
    opacity 0.2s ease-out;
  z-index: -1;
}

div#tag p {
  position: absolute;
  border: 1px solid white;
  background-color: #16161d;
  padding: 7px 8px;
  color: white;
  z-index: 2;
}
</style>
