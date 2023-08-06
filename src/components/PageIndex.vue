<template>
  <div v-if="!currentComponent" class="container">
    <div class="list">
      <div class="item" v-for="(item, idx) in demoList" :key="idx" @click="viewDemo(item)">
        <div class="img-wrapper">
          <img :src="item.img" alt="">
        </div>
        <div class="name">{{ item.name }}</div>
      </div>
    </div>
  </div>
  <div v-else class="comp-wrapper">
    <component :is="currentComponent"></component>
  </div>
  <div v-show="currentComponent" class="back-btn" @click="currentComponent = null">返回列表</div>
</template>

<script lang="ts" setup>
import bombMan from '../examples/game/index.vue'
import VRLookHouse from '../examples/VRLookHouse.vue'
import VRDemo from '../examples/VRDemo.vue'
import img1 from '../assets/images/game-pic.jpg'
import img2 from '../assets/images/lookhouse-pic.jpg'
import img3 from '../assets/images/iland-pic.jpg'

import { shallowRef, markRaw, ref } from 'vue'

const demoList = shallowRef([
  {
    name: '简易版炸弹超人',
    component: markRaw(bombMan),
    img: img1
  },
  {
    name: 'VR看房',
    component: markRaw(VRLookHouse),
    img: img2
  },
  {
    name: 'VRDemo',
    component: markRaw(VRDemo),
    img: img3
  }
])

const currentComponent = ref(null)

const viewDemo = (item) => {
  currentComponent.value = item.component
}

</script>

<style lang="scss" scoped>
.container {
  box-sizing: border-box;
  .list {
    display: flex;
    flex-wrap: wrap;
  }
  .item {
    width: calc(25% - 20px);
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
    margin: 20px 10px;
    box-sizing: border-box;
    cursor: pointer;
    .img-wrapper {
      width: 100%;
      height: 200px;
      background-color: #999;
      margin-bottom: 20px;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
}
.back-btn {
  padding: 6px 10px;
  border-radius: 4px;
  background-color: #09a0f7;
  cursor: pointer;
  color: #fff;

  position: fixed;
  top: 10px;
  left: 100px;
}
</style>
