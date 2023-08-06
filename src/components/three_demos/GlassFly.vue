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
  camera.position.set(100, 100, 100)
  camera.lookAt(0, 0, 0)
  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(width, height)
  threeContainer.value.appendChild(renderer.domElement)
  const texture = new THREE.TextureLoader().load('/textures/Texturelabs_Glass_141S.jpg')

  for (let i = 0; i < 100; i++) {
    const geometry = new THREE.BufferGeometry()
    const position = new Float32Array(9)
    // 为geometry设置uv
    const uvs = new Float32Array([
      0, 0, // 图片左下角
      1, 0, // 图片右下角
      1, 1, // 图片右上角
      0, 1 // 图片左上角
    ])
    for (let j = 0; j < 9; j++) {
      position[j] = (Math.random() - 0.5) * 100
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      transparent: true,
      opacity: 0.8,
      map: texture,
      side: THREE.DoubleSide
    }))
    gsap.to(mesh.rotation, {
      x: Math.PI * 2,
      duration: 5,
      // yoyo: true,
      repeat: -1,
      ease: 'linear'
    })
    gsap.to(mesh.position, {
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 300,
      z: (Math.random() - 0.5) * 300,
      duration: 5,
      // yoyo: true,
      // repeat: 1,
      ease: 'linear'
    })
    scene.add(mesh)
  }

  // scene.add(new THREE.GridHelper(100, 100, 0xffffff, 0xffffff))

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.autoRotate = true
  controls.autoRotateSpeed = 5
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
