import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'

import homeStore from '@/features/stores/home'
import menuStore from '@/features/stores/menu'
import settingsStore from '@/features/stores/settings'
import { TextButton } from '../textButton'

const Mqtt = ({ onSaveSettings }: { onSaveSettings: () => void }) => {
  const mqttMode = settingsStore((s) => s.mqttMode)
  const mqttUrl = settingsStore((s) => s.mqttUrl)
  const mqttTopic = settingsStore((s) => s.mqttTopic)

  const { t } = useTranslation()

  // ローカルの一時的な状態
  const [localMqttMode, setLocalMqttMode] = useState(mqttMode)
  const [localMqttUrl, setLocalMqttUrl] = useState(mqttUrl)
  const [localMqttTopic, setLocalMqttTopic] = useState(mqttTopic)

  useEffect(() => {
    // Storeの値が変更されたらローカルの状態に反映
    setLocalMqttMode(mqttMode)
    setLocalMqttUrl(mqttUrl)
    setLocalMqttTopic(mqttTopic)
  }, [mqttMode, mqttUrl, mqttTopic])

  // MQTT Modeの切り替え時に購読処理を再実行
  const handleChangeMqttMode = (mqttMode: boolean) => {
    setLocalMqttMode(mqttMode)
    settingsStore.setState({ mqttMode })
    handleSaveSettings() // Mode切り替え時に設定を保存して購読処理を行う
  }

  // 保存ボタンでMQTT設定を反映させる
  const handleSaveSettings = () => {
    settingsStore.setState({
      mqttUrl: localMqttUrl,
      mqttTopic: localMqttTopic
    })
  }

  return (
    <div className="my-40">
      <div className="my-16 typography-20 font-bold">{t('MqttMode')}</div>
      <div className="my-8">
        {localMqttMode ? (
          <TextButton onClick={() => handleChangeMqttMode(false)}>
            {t('StatusOn')}
          </TextButton>
        ) : (
          <TextButton onClick={() => handleChangeMqttMode(true)}>
            {t('StatusOff')}
          </TextButton>
        )}
      </div>
      {localMqttMode && (
        <div className="my-16">
          <div className="">{t('MqttInfo')}</div>
          <div className="my-16 typography-20 font-bold">{t('MqttUrl')}</div>
          <input
            className="text-ellipsis px-16 py-8 w-col-span-3 bg-surface1 hover:bg-surface1-hover rounded-8"
            type="text"
            placeholder="..."
            value={localMqttUrl}
            onChange={(e) => setLocalMqttUrl(e.target.value)} // 一時的にローカルの状態を更新
          />
          <div className="my-16 typography-20 font-bold">{t('MqttTopic')}</div>
          <input
            className="text-ellipsis px-16 py-8 w-col-span-3 bg-surface1 hover:bg-surface1-hover rounded-8"
            type="text"
            placeholder="..."
            value={localMqttTopic}
            onChange={(e) => setLocalMqttTopic(e.target.value)} // 一時的にローカルの状態を更新
          />
          <div className="my-16">
            <TextButton onClick={handleSaveSettings}>
              {t('SaveSettings')}
            </TextButton>
          </div>
        </div>
      )}
    </div>
  )
}
export default Mqtt
