<script setup>
// 散落的五彩玻璃
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
const threeContainer = ref()
onMounted(() => {
  const width = threeContainer.value.offsetWidth
  const height = threeContainer.value.offsetHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000)

  camera.position.set(30, 30, 30)
  camera.lookAt(0, 0, 0)
  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(width, height)
  threeContainer.value.appendChild(renderer.domElement)
  const texture = new THREE.TextureLoader().load('/textures/Texturelabs_Fabric_164S.jpg')
  const alphaTexture = new THREE.TextureLoader().load('/textures/alpha.jpg')
  texture.center.set(0.5, 0.5)
  scene.add(new THREE.Mesh(
    new THREE.BoxGeometry(100, 1, 100),
    new THREE.MeshBasicMaterial({
      map: texture,
      alphaMap: alphaTexture,
      transparent: true
    })
  ))

  // scene.add(new THREE.GridHelper(100, 100, 0xffffff, 0xffffff))

  const controls = new OrbitControls(camera, renderer.domElement)
  // controls.autoRotate = true
  // controls.autoRotateSpeed = 5
  controls.enableDamping = true
  function render () {
    requestAnimationFrame(render)
    controls.update()
    renderer.render(scene, camera)
  }
  render()
  window.addEventListener('resize', () => {
    const width = threeContainer.value?.offsetWidth || 0
    const height = threeContainer.value?.offsetHeight || 0
    // 修改相机参数，宽高比
    camera.aspect = width / height
    // 更新投影的变换矩阵
    camera.updateProjectionMatrix()
    // 重新设置渲染器尺寸
    renderer.setSize(width, height)
    // 设置渲染器的像素比
    renderer.setPixelRatio(window.devicePixelRatio)
  })
})
</script>

<template>
  <div class="container" ref="threeContainer">

  </div>
</template>

<style lang="scss" scoped>
  .container {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>
