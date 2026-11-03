/**
 * AI Agent 对话 API
 * 提供智能体列表查询、会话创建、流式对话能力
 */

import {getBaseUrl} from './request'
import type {AgentConfig} from '../types'

const BASE = '/api/v1'

/** 创建会话响应 */
export interface CreateSessionResponse {
    sessionId: string
}

/** 流式对话请求 */
export interface ChatStreamPayload {
    agentId: string
    userId: string
    sessionId?: string
    message: string
    terminalSessionId?: string
}

/** 查询智能体配置列表 */
export async function queryAgentList(): Promise<AgentConfig[]> {
    const res = await fetch(`${getBaseUrl()}${BASE}/query_ai_agent_config_list`)
    if (!res.ok) {
        throw new Error(`查询智能体列表失败: ${res.statusText}`)
    }
    const json = await res.json()
    if (json.code !== '0000' || !json.data) {
        throw new Error(json.info || '查询智能体列表失败')
    }
    return json.data as AgentConfig[]
}

/** 创建对话会话 */
export async function createSession(agentId: string, userId: string): Promise<string> {
    const res = await fetch(`${getBaseUrl()}${BASE}/create_session`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({agentId, userId}),
    })
    if (!res.ok) {
        throw new Error(`创建会话失败: ${res.statusText}`)
    }
    const json = await res.json()
    if (json.code !== '0000' || !json.data) {
        throw new Error(json.info || '创建会话失败')
    }
    return (json.data as CreateSessionResponse).sessionId
}

/** SSE 事件类型 */
export interface SSEEvent {
    event: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'round_end'
    content?: string
    fullText?: string
    toolCallId?: string
    toolName?: string
    status?: string
}

/** 流式对话：通过 ReadableStream 逐段读取并回调 */
export async function chatStream(
    payload: ChatStreamPayload,
    onEvent: (event: SSEEvent) => void,
    signal?: AbortSignal,
): Promise<void> {
    // 10 分钟超时（AI + SSH 命令执行可能需要较长时间）
    const TIMEOUT_MS = 10 * 60 * 1000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    // 如果外部传入了 signal，监听它的 abort 事件并转发
    if (signal) {
        if (signal.aborted) {
            clearTimeout(timer)
            throw new DOMException('Aborted', 'AbortError')
        }
        signal.addEventListener('abort', () => {
            clearTimeout(timer)
            controller.abort()
        })
    }

    let res: Response
    try {
        res = await fetch(`${getBaseUrl()}${BASE}/chat_stream`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
            signal: controller.signal,
        })
    } catch (err: any) {
        clearTimeout(timer)
        if (err?.name === 'AbortError') {
            throw new Error('请求超时或被取消')
        }
        throw err
    }

    if (!res.ok) {
        clearTimeout(timer)
        throw new Error(`流式对话请求失败: ${res.statusText}`)
    }

    if (!res.body) {
        clearTimeout(timer)
        throw new Error('响应没有 body')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
        while (true) {
            const {done, value} = await reader.read()
            if (done) break
            buffer += decoder.decode(value, {stream: true})

            // 按换行符分割，每行是一个 JSON 事件
            const lines = buffer.split('\n')
            // 最后一段可能不完整，保留在 buffer 中
            buffer = lines.pop() || ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue
                try {
                    const event: SSEEvent = JSON.parse(trimmed)
                    onEvent(event)
                } catch {
                    // 非 JSON 行，跳过
                }
            }
        }
        // 处理 buffer 中剩余的数据
        const trimmed = buffer.trim()
        if (trimmed) {
            try {
                const event: SSEEvent = JSON.parse(trimmed)
                onEvent(event)
            } catch {
                // 忽略
            }
        }
    } finally {
        clearTimeout(timer)
        reader.releaseLock()
    }
}
