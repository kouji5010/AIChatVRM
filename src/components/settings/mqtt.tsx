import { useTranslation } from 'react-i18next'
import { useState, useEffect } from'react'

import homeStore from '@/features/stores/home'
import menuStore from '@/features/stores/menu'
import settingsStore from '@/features/stores/settings'
import { TextButton } from '../textButton'

//const Mqtt = () => {
const Mqtt = ({ onSaveSettings }: { onSaveSettings: () => void }) => {
  const mqttMode = settingsStore((s) => s.mqttMode)
  const mqttUrl = settingsStore((s) => s.mqttUrl)
  const mqttTopic = settingsStore((s) => s.mqttTopic)

  const { t } = useTranslation()

  const handleChangeMqttMode = (mqttMode: boolean) => {
    settingsStore.setState({ mqttMode })
  }

  const handleChangeMqttUrl = (mqttUrl: string) => {
    settingsStore.setState({ mqttUrl })
  }

  const handleChangeMqttTopic = (mqttTopic: string) => {
    settingsStore.setState({ mqttTopic })
  }

  const handleMenuClose = () => {
    handleSaveSettings()
  }
    
  return (
    <div className="my-40">
      <div className="my-16 typography-20 font-bold">{t('MqttMode')}</div>
      <div className="my-8">
        {mqttMode ? (
          <TextButton onClick={() => handleChangeMqttMode(false)}>
            {t('StatusOn')}
          </TextButton>
        ) : (
          <TextButton onClick={() => handleChangeMqttMode(true)}>
            {t('StatusOff')}
          </TextButton>
        )}
      </div>
      <div className="my-16">
        {(() => {
          if (mqttMode) {
            return (
              <>
                <div className="">{t('MqttInfo')}</div>
                <div className="my-16 typography-20 font-bold">
                  {t('MqttUrl')}
                </div>
                <input
                  className="text-ellipsis px-16 py-8 w-col-span-3 bg-surface1 hover:bg-surface1-hover rounded-8"
                  type="text"
                  placeholder="..."
                  value={mqttUrl}
                  onChange={(e) =>
                    handleChangeMqttUrl(e.target.value)
                  }
                />
                <div className="my-16 typography-20 font-bold">
                  {t('MqttTopic')}
                </div>
                <input
                  className="text-ellipsis px-16 py-8 w-col-span-3 bg-surface1 hover:bg-surface1-hover rounded-8"
                  type="text"
                  placeholder="..."
                  value={mqttTopic}
                  onChange={(e) =>
                    handleChangeMqttTopic(e.target.value)
                  }
                />
              </>
            )
          }
        })()}
      </div>
    </div>
  )
}
export default Mqtt
