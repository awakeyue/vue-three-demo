<script setup>
// 散落的五彩玻璃
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Water } from 'three/examples/jsm/objects/Water'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
const threeContainer = ref()
onMounted(() => {
  const width = threeContainer.value.offsetWidth
  const height = threeContainer.value.offsetHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000)

  // 环境光
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  // 光
  const light = new THREE.PointLight(0xffffff, 1)
  light.castShadow = true
  light.position.set(10000, 10000, 10000)
  scene.add(light)
  camera.position.set(-50, 50, 130)
  camera.lookAt(0, 0, 0)
  const renderer = new THREE.WebGLRenderer({
    antialias: true
  })
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap
  threeContainer.value.appendChild(renderer.domElement)

  // 添加辅助坐标
  // scene.add(new THREE.AxesHelper(1000))
  // scene.add(new THREE.CameraHelper(light.shadow.camera))

  // 天空
  const sky = new Sky()
  sky.scale.setScalar(10000)
  const skyUniforms = sky.material.uniforms
  /* eslint-disable */
  skyUniforms['turbidity'].value = 20 // 浊度
  skyUniforms['rayleigh'].value = 2
  skyUniforms['mieCoefficient'].value = 0.005
  skyUniforms['mieDirectionalG'].value = 0.8
  /* eslint-enable */
  scene.add(sky)

  // 添加水
  const sun = new THREE.Vector3()
  const water = new Water(
    new THREE.CircleGeometry(1200, 64),
    {
      textureWidth: 512,
      textureHeight: 512,
      color: 0x00c0ff,
      waterNormals: new THREE.TextureLoader().load('/textures/waternormals.jpg', texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      distortionScale: 3.7
    }
  )
  water.rotateX(-Math.PI / 2)
  scene.add(water)

  const parameters = {
    elevation: 2,
    azimuth: 180
  }
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  let renderTarget
  function updateSun () {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation)
    const theta = THREE.MathUtils.degToRad(parameters.azimuth)

    sun.setFromSphericalCoords(1, phi, theta)

    /* eslint-disable */
    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize()
    /* eslint-enable */
    if (renderTarget !== undefined) renderTarget.dispose()

    renderTarget = pmremGenerator.fromScene(sky)

    scene.environment = renderTarget.texture
  }
  updateSun()

  // gui
  const gui = new GUI()
  gui.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun)
  gui.add(parameters, 'azimuth', 0, 360, 0.1).onChange(updateSun)
  const controls = new OrbitControls(camera, renderer.domElement)
  // controls.autoRotate = true
  // controls.autoRotateSpeed = 5
  controls.enableDamping = true
  controls.minDistance = 50
  controls.maxDistance = 1200
  function render () {
    // console.log(Math.pow(Math.sin(time), 2) + Math.pow(Math.cos(time), 2))
    requestAnimationFrame(render)
    /* eslint-disable */
    water.material.uniforms['time'].value += 0.02
    /* eslint-enable */
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
