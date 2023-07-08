import { isNil } from '../utils'

type ChannelCallback<TData = any> = (data: TData) => void
type ChannelCreate = <TData = any>(
  topic: string,
  callback?: ChannelCallback<TData>,
) => Optional<ChannelActions>
type ChannelEvent = <TData = any>(
  topic: string,
  callback?: ChannelCallback<TData>,
) => (e: MessageEvent) => void

interface ChannelActions {
  subscribe: () => void
  unsubscribe: () => void
  remove: () => void
  refresh: () => void
}

const SSE_CHANNEL = getEventSource('/api/events')
const CHANNELS = new Map<string, ChannelActions>()

const handleChannelTopicCallback: ChannelEvent =
  function handleChannelTopicCallback(topic, callback) {
    return (event: MessageEvent<string>) => {
      if (isNil(topic) || isNil(callback) || isNil(event.data)) return

      try {
        callback?.(JSON.parse(event.data))
      } catch (error) {
        console.warn(error)
      }
    }
  }

const createChannel: ChannelCreate = function createChannel(topic, callback) {
  const handler = handleChannelTopicCallback(topic, callback)

  if (isNil(topic) || isNil(handler) || CHANNELS.has(topic))
    return CHANNELS.get(topic)

  function subscribe(): void {
    SSE_CHANNEL.addEventListener(topic, handler)
  }

  function unsubscribe(): void {
    SSE_CHANNEL.removeEventListener(topic, handler)
  }

  function remove(): void {
    unsubscribe()

    CHANNELS.delete(topic)
  }

  function refresh(): void {
    unsubscribe()

    setTimeout(() => {
      subscribe()
    }, 500)
  }

  CHANNELS.set(topic, {
    refresh,
    remove,
    subscribe,
    unsubscribe,
  })

  return CHANNELS.get(topic)
}

export function useChannelEvents(): ChannelCreate {
  return (topic, callback) => createChannel(topic, callback)
}

function getEventSource(source: string): EventSource {
  return new EventSource(source)
}
