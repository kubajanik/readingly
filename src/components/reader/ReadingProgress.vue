<template>
    <div class="reading-progress" :style="{ width: progress + '%' }"></div>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'ReadingProgress',
    computed: mapState('reader', ['progress'])
}
</script>

<style scoped>
    .reading-progress {
        height: 4px;
        position: fixed;
        bottom: 0;
        background: #333;
    }
</style>