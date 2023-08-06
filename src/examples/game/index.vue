<template>
  <canvas ref="container" class="container"></canvas>
</template>

<script lang="ts" setup>
import { initGame, dispose } from './index'
import { onMounted, onUnmounted, ref } from 'vue'

const container = ref()
onMounted(() => {
  console.log('挂载')
  initGame({
    canvas: container.value,
    debug: true
  })
})

onUnmounted(() => {
  console.log('组件卸载')
  dispose()
})

</script>

<style lang="scss" scoped>
.container {
  max-width: 100%;
  height: 100vh;
  width: 100vw;
}
</style>
