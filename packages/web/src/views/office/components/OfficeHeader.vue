<template>
  <header class="dashboard-header">
    <div class="masthead-left">
      <div class="edition-stamp">
        <span class="edition-num">N°042</span>
        <span class="edition-rule"></span>
        <span class="edition-date">{{ editionDate }}</span>
      </div>
      <div class="title-block">
        <span class="page-kicker">OPC · PIXEL OFFICE · LIVE</span>
        <h1>
          数字员工<span class="title-amp">×</span>像素办公室
          <i class="title-asterisk" aria-hidden="true">✻</i>
        </h1>
        <p class="lede">四间值班室 · 二十四小时运转的<br />无纸化数字员工总部</p>
      </div>
    </div>

    <section class="stats-bar" aria-label="今日运营统计">
      <article
        v-for="(item, i) in statItems"
        :key="item.label"
        :class="item.tone"
        :title="item.note"
        :style="{ '--i': i }"
      >
        <span class="stat-label">{{ item.label }}</span>
        <strong class="stat-value">{{ item.value }}</strong>
        <em class="stat-note">{{ item.note }}</em>
        <i class="stat-bar"></i>
      </article>
    </section>

    <div class="header-clock">
      <div class="clock-meta">
        <span class="live-pill"><i></i>LIVE</span>
        <small>实时办公中</small>
      </div>
      <strong class="clock-time">{{ currentTime }}</strong>
      <div class="clock-day">{{ dayOfWeek }} · 今日 24h 运转</div>
    </div>
  </header>
</template>

<script setup lang="ts">
export interface OfficeStatItem {
  label: string
  value: string | number
  note: string
  tone: string
}

defineProps<{
  editionDate: string
  dayOfWeek: string
  currentTime: string
  statItems: OfficeStatItem[]
}>()
</script>
