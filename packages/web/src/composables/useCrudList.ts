import { reactive, ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ApiResponse, PaginatedResult } from '@/types'

interface CrudParams {
  page: number
  pageSize: number
  [key: string]: unknown
}

type CrudFetch<T, P extends CrudParams> = (
  params: P,
) => Promise<ApiResponse<PaginatedResult<T>>>

/**
 * 通用列表数据 composable
 * - 统一管理 list / total / loading / 分页
 * - 失败时通过全局拦截器弹 ElMessage
 */
export function useCrudList<T, P extends CrudParams>(
  fetcher: CrudFetch<T, P>,
  extraParams: Partial<P> = {},
) {
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const loading = ref(false)

  const params = reactive<P>({
    page: 1,
    pageSize: 10,
    ...extraParams,
  } as P)

  async function fetchList() {
    loading.value = true
    try {
      const res = await fetcher(params as P)
      list.value = res.data.items || []
      total.value = res.data.total || 0
    } catch {
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  function resetSearch() {
    Object.keys(params).forEach((k) => {
      if (k !== 'page' && k !== 'pageSize') {
        ;(params as Record<string, unknown>)[k] = ''
      }
    })
    params.page = 1
  }

  function refresh() {
    return fetchList()
  }

  return {
    list,
    total,
    loading,
    params,
    fetchList,
    refresh,
    resetSearch,
  }
}

/** 简单的 promise 操作 wrapper，附带 ElMessage 提示 */
export async function runMutation<T>(
  promise: Promise<ApiResponse<T>>,
  successMsg = '操作成功',
): Promise<T | null> {
  try {
    const res = await promise
    if (successMsg) ElMessage.success(successMsg)
    return res.data
  } catch {
    return null
  }
}
