<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed, type CSSProperties } from 'vue'

const props = defineProps<{
  data: {
    label: string
    type?: 'central' | 'input'
    shape?: 'round' | 'square'
    color?: string
    code?: string
    level?: number
  }
}>()

const nodeStyle = computed((): CSSProperties => {
  if (props.data.type === 'central') {
    return {
      backgroundColor: '#000000',
      borderColor: '#ffffff',
      borderRadius: '50%',
      width: '120px',
      height: '120px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }

  // Hierarchical Sizing based on level
  const level = props.data.level || 1
  let size = '90px' // Default for Lv 1 (smaller than Goal 120px)
  let padding = '10px'
  let fontSize = '14px'

  if (level === 2) {
    size = '70px'
    fontSize = '12px'
  } else if (level >= 3) {
    size = '50px'
    padding = '5px'
    fontSize = '11px'
  }

  return {
    backgroundColor: props.data.color || '#3b82f6',
    borderColor: 'transparent',
    borderRadius: '8px',
    width: size,
    height: size,
    padding: padding,
    fontSize: fontSize,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  }
})

const labelStyle = computed((): CSSProperties => ({
  color: props.data.type === 'central' ? '#ffffff' : '#ffffff',
  fontWeight: 'bold',
  fontSize: props.data.type === 'central' ? '16px' : '14px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  display: 'block',
  textAlign: 'center'
}))

const codeStyle = computed((): CSSProperties => {
  if (props.data.type === 'central') {
    return { display: 'none' }
  }
  return {
    color: '#ffffff',
    fontSize: '10px',
    opacity: 0.8,
    position: 'absolute',
    top: '4px',
    left: '6px',
    fontWeight: 'bold'
  }
})
</script>

<template>
  <div class="custom-node" :style="nodeStyle">
    <!-- Handles on all 4 sides with unique IDs -->
    <Handle id="target-top" type="target" :position="Position.Top" class="handle" />
    <Handle id="source-top" type="source" :position="Position.Top" class="handle" />

    <Handle id="target-right" type="target" :position="Position.Right" class="handle" />
    <Handle id="source-right" type="source" :position="Position.Right" class="handle" />

    <Handle id="target-bottom" type="target" :position="Position.Bottom" class="handle" />
    <Handle id="source-bottom" type="source" :position="Position.Bottom" class="handle" />

    <Handle id="target-left" type="target" :position="Position.Left" class="handle" />
    <Handle id="source-left" type="source" :position="Position.Left" class="handle" />

    <div class="content" style="width: 100%; padding: 0 4px; text-align: center;">
      <span v-if="data.code" :style="codeStyle">{{ data.code }}</span>
      <span :style="labelStyle">{{ data.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.custom-node {
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 2px solid;
}

.custom-node:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
}

.handle {
  width: 10px;
  height: 10px;
  background: transparent;
  border: none;
}

/* Show handles on hover to make connecting easier */
.custom-node:hover .handle {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
}
</style>
