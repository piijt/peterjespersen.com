<script setup lang="ts">
definePageMeta({ layout: "v2" });

useHead({ title: "Peter Jespersen — software developer" });
useSeoMeta({
  description:
    "Peter Jespersen, software developer from Denmark. Trade-Raid, flow, Snapshot — and 15,000+ GitHub contributions rendered as a city.",
  ogTitle: "Peter Jespersen — software developer",
});

const { data } = useContributions();
</script>

<template>
  <main>
    <SiteHero :data="data ?? null" />
    <SiteContribGraph :data="data ?? null" />
    <WorldsTradeRaidWorld />
    <WorldsFlowWorld />
    <WorldsSnapshotWorld />
    <SiteContact />
  </main>
</template>
