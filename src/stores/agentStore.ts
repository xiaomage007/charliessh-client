import {create} from 'zustand'
import type {AgentConfig, AgentMessage, AgentSession} from '../types'
import * as agentApi from '../api/agent'

interface AgentStore {
    // 智能体列表
    agents: AgentConfig[]
    // 当前选中的智能体ID
    currentAgentId: string | null
    // 当前会话 ID
    currentSessionId: string | null
    // 会话历史
    sessions: Map<string, AgentSession>
    // 输入框内容
    inputText: string
    // 是否等待响应
    isLoading: boolean
    // 加载状态文案
    loadingText: string
    // 当前流式请求的 AbortController
    abortController: AbortController | null

    // 设置智能体列表
    setAgents: (agents: AgentConfig[]) => void
    // 加载智能体列表
    loadAgents: () => Promise<void>
    // 设置当前智能体
    setCurrentAgent: (agentId: string | null) => void
    // 设置当前会话
    setCurrentSession: (id: string | null) => void
    // 添加消息
    addMessage: (sessionId: string, message: AgentMessage) => void
    // 更新最后一条助手消息（流式追加）
    appendToLastAssistant: (sessionId: string, delta: string) => void
    // 替换最后一条助手消息的完整内容（用于 fullText 去重）
    replaceLastAssistant: (sessionId: string, fullText: string) => void
    // 设置输入框内容
    setInputText: (text: string) => void
    // 设置加载状态
    setLoading: (loading: boolean, text?: string) => void
    // 设置中止控制器
    setAbortController: (controller: AbortController | null) => void
    // 停止当前生成
    stopGeneration: () => void
    // 创建新会话
    createSession: (name?: string) => string
    // 创建后端会话并绑定
    ensureBackendSession: () => Promise<string | null>
    // 发送消息（真实对接后端流式接口）
    sendMessage: (content: string, terminalSessionId?: string | null) => Promise<void>
}

const DEFAULT_USER_ID = 'walissh-user'

export const useAgentStore = create<AgentStore>((set, get) => ({
    agents: [],
    currentAgentId: null,
    currentSessionId: null,
    sessions: new Map(),
    inputText: '',
    isLoading: false,
    loadingText: '思考中...',
    abortController: null,

    setAgents: (agents) => set({agents}),

    loadAgents: async () => {
        try {
            const agents = await agentApi.queryAgentList()
            set({agents})
            // 默认选中第一个
            if (agents.length > 0 && !get().currentAgentId) {
                set({currentAgentId: agents[0].agentId})
            }
        } catch (err: any) {
            console.error('加载智能体列表失败', err)
        }
    },

    setCurrentAgent: (agentId) => set({currentAgentId: agentId}),

    setCurrentSession: (id) => set({currentSessionId: id}),

    addMessage: (sessionId, message) =>
        set((state) => {
            const sessions = new Map(state.sessions)
            const session = sessions.get(sessionId)
            if (session) {
                sessions.set(sessionId, {
                    ...session,
                    messages: [...session.messages, message],
                })
            }
            return {sessions}
        }),

    appendToLastAssistant: (sessionId, delta) =>
        set((state) => {
            const sessions = new Map(state.sessions)
            const session = sessions.get(sessionId)
            if (!session || session.messages.length === 0) return {sessions}

            const messages = [...session.messages]
            const lastIndex = messages.length - 1
            const last = messages[lastIndex]
            if (last.role !== 'assistant') return {sessions}

            messages[lastIndex] = {...last, content: last.content + delta}
            sessions.set(sessionId, {...session, messages})
            return {sessions}
        }),

    replaceLastAssistant: (sessionId, fullText) =>
        set((state) => {
            const sessions = new Map(state.sessions)
            const session = sessions.get(sessionId)
            if (!session || session.messages.length === 0) return {sessions}

            const messages = [...session.messages]
            const lastIndex = messages.length - 1
            const last = messages[lastIndex]
            if (last.role !== 'assistant') return {sessions}

            // 直接替换为完整文本（AI 已包含所有格式化内容）
            messages[lastIndex] = {...last, content: fullText}
            sessions.set(sessionId, {...session, messages})
            return {sessions}
        }),

    setInputText: (text) => set({inputText: text}),

    setLoading: (loading, text) =>
        set({isLoading: loading, loadingText: text || (loading ? '思考中...' : '思考中...')}),

    setAbortController: (controller) => set({abortController: controller}),

    stopGeneration: () => {
        const controller = get().abortController
        if (controller) {
            controller.abort()
            set({abortController: null, isLoading: false, loadingText: '思考中...'})
        }
    },

    createSession: (name) => {
        const id = `session_${Date.now()}`
        const session: AgentSession = {
            id,
            name: name || `会话 ${get().sessions.size + 1}`,
            messages: [] as AgentMessage[],
            createdAt: Date.now(),
        }
        set((state) => {
            const sessions = new Map(state.sessions)
            sessions.set(id, session)
            return {sessions, currentSessionId: id}
        })
        return id
    },

    ensureBackendSession: async () => {
        const state = get()
        const sessionId = state.currentSessionId
        if (!sessionId) return null

        const session = state.sessions.get(sessionId)
        if (!session) return null

        // 已有后端 sessionId 直接返回
        if (session.backendSessionId) {
            return session.backendSessionId
        }

        const agentId = state.currentAgentId
        if (!agentId) {
            throw new Error('未选择智能体')
        }

        const backendSessionId = await agentApi.createSession(agentId, DEFAULT_USER_ID)
        set((s) => {
            const sessions = new Map(s.sessions)
            const current = sessions.get(sessionId)
            if (current) {
                sessions.set(sessionId, {
                    ...current,
                    agentId,
                    userId: DEFAULT_USER_ID,
                    backendSessionId,
                })
            }
            return {sessions}
        })
        return backendSessionId
    },

    sendMessage: async (content, terminalSessionId) => {
        const state = get()
        const sessionId = state.currentSessionId
        const agentId = state.currentAgentId

        if (!sessionId) {
            throw new Error('当前没有活跃会话')
        }
        if (!agentId) {
            throw new Error('未选择智能体')
        }

        // 1. 添加用户消息
        const userMessage: AgentMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content,
            timestamp: Date.now(),
        }
        get().addMessage(sessionId, userMessage)
        get().setLoading(true, 'WaLiSSH 正在思考...')

        try {
            // 2. 确保后端会话已创建
            const backendSessionId = await get().ensureBackendSession()
            if (!backendSessionId) {
                throw new Error('创建后端会话失败')
            }

            // 3. 预先插入一条空的助手消息，流式追加
            const assistantMessage: AgentMessage = {
                id: `msg_${Date.now()}_ai`,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
            }
            get().addMessage(sessionId, assistantMessage)

            // 4. 发起流式请求
            const controller = new AbortController()
            get().setAbortController(controller)

            await agentApi.chatStream(
                {
                    agentId,
                    userId: DEFAULT_USER_ID,
                    sessionId: backendSessionId,
                    message: content,
                    terminalSessionId: terminalSessionId || undefined,
                },
                (event) => {
                    if (event.event === 'text') {
                        // 优先使用 fullText 做替换（避免流式片段重复），回退到 content 追加
                        if (event.fullText) {
                            get().replaceLastAssistant(sessionId, event.fullText)
                        } else if (event.content) {
                            get().appendToLastAssistant(sessionId, event.content)
                        }
                    } else if (event.event === 'error' && event.content) {
                        // 错误事件
                        get().appendToLastAssistant(sessionId, `\n\n⚠️ ${event.content}`)
                    }
                    // done 事件不需要额外处理，文本已在 text 事件中替换
                },
                controller.signal,
            )
        } catch (err: any) {
            console.error('发送消息失败', err)
            const errorMessage: AgentMessage = {
                id: `msg_${Date.now()}_err`,
                role: 'system',
                content: `请求失败: ${err.message || '未知错误'}`,
                timestamp: Date.now(),
            }
            get().addMessage(sessionId, errorMessage)
        } finally {
            get().setLoading(false)
            get().setAbortController(null)
        }
    },
}))
