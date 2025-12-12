<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'
import { useDiagramState } from '../stores/diagramStore'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: any
  targetPosition: any
  data?: {
    sign?: '+' | '-'
    color?: string
  }
  markerEnd?: string
}>()

const { findEdge } = useVueFlow()
const { recalculateWeights } = useDiagramState()

const path = computed(() => getBezierPath(props))

const toggleSign = (evt: Event) => {
  evt.stopPropagation()
  const edge = findEdge(props.id)
  if (edge) {
    // Update edge sign
    edge.data = { ...edge.data, sign: edge.data?.sign === '+' ? '-' : '+' }
    // Recalculate weights after changing polarity
    setTimeout(() => recalculateWeights(), 50)
  }
}

const edgeColor = computed(() => props.data?.color || '#64748b')
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<template>
  <BaseEdge :path="path[0]" :style="{ stroke: edgeColor, strokeWidth: 2 }" :marker-end="markerEnd" />

  <EdgeLabelRenderer>
    <div :style="{
      transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)`,
      pointerEvents: 'all',
    }" class="edge-label nodrag nopan" @click="toggleSign">
      <div class="sign-badge" :style="{ backgroundColor: edgeColor }">
        {{ data?.sign || '+' }}
      </div>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.edge-label {
  position: absolute;
  z-index: 10;
  cursor: pointer;
}

.sign-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.sign-badge:hover {
  transform: scale(1.1);
}
</style>
