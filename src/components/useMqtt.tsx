import { useEffect, useState, useCallback } from 'react'
import mqtt from 'mqtt'

import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'

/// 取得したコメントをストックするリストの作成（tmpMessages）
interface TmpMessage {
  text: string
  role: string
  emotion: string
  state: string
}

interface Params {
  handleReceiveTextFromWs: (
    text: string,
    role?: string,
    state?: string
  ) => Promise<void>
}

const useMqtt = ({ handleReceiveTextFromWs }: Params) => {
  const mqttMode = settingsStore((s) => s.mqttMode)
  const mqttUrl = settingsStore((s) => s.mqttUrl);
  const mqttTopic = settingsStore((s) => s.mqttTopic);
  const [tmpMessages, setTmpMessages] = useState<TmpMessage[]>([])
  const [mqttConnected, setMqttConnected] = useState(false);

  const processMessage = useCallback(
    async (message: TmpMessage) => {
      await handleReceiveTextFromWs(message.text, message.role, message.state)
    },
    [handleReceiveTextFromWs]
  )

  useEffect(() => {
    if (tmpMessages.length > 0) {
      const message = tmpMessages[0]
      if (
        message.role === 'output' ||
        message.role === 'executing' ||
        message.role === 'console'
      ) {
        message.role = 'code'
      }
      setTmpMessages((prev) => prev.slice(1))
      processMessage(message)
    }
  }, [tmpMessages, processMessage])

  // MQTT接続の設定
  useEffect(() => {
    const ss = settingsStore.getState()
    if (!ss.mqttMode) return
    if (!ss.mqttUrl) return;

    const topics = mqttTopic
      .split(',')
      .map((topic) => topic.trim()) // 空白を削除
      .filter((topic) => topic !== "") // 空のトピックを除外
      
    const clientId = 'ClientID_' + Date.now();
    const connectOptions = {
      clientId,
      keepalive: 30, // サーバーに送信するpingの間隔（秒）
      reconnectPeriod: 1000, // 自動再接続までの待機時間（ミリ秒）
      rejectUnauthorized: false  // セキュリティの警告: 本番環境では推奨されません
    };
    const client = mqtt.connect(mqttUrl, connectOptions);

    client.on('connect', () => {
      console.log('MQTT connection opened')
      if (topics.length > 0) {
        client.subscribe(topics, (err) => {
          if (err) {
            console.error('Subscription error:', err)
          } else {
            console.log('Subscribed to topics:', topics)
          }
        })
      }
    })

    client.on('message', (topic, message) => {
      console.log(`Received message on topic ${topic}:`, message.toString())
      try {
        const jsonData = JSON.parse(message.toString())
        setTmpMessages((prevMessages) => [...prevMessages, jsonData])
      } catch (e) {
        //console.error('Failed to parse message as JSON:', e)
        // JSONでないメッセージをそのまま使う場合
        setTmpMessages((prevMessages) => [
          ...prevMessages,
          { text: message.toString(), role: 'assistant', emotion: 'neutral', state: 'end' },
        ])
      }
    })

    client.on('error', (err) => {
      console.error('MQTT error:', err)
    })

    client.on('close', () => {
      console.log('MQTT connection closed')
    })

    homeStore.setState({ mqttClient: client })

    return () => {
      client.end()
      homeStore.setState({ mqttClient: null })
    }
  }, [mqttMode])

  return null
}

export default useMqtt
