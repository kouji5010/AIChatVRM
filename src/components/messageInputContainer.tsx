import { useState, useEffect, useCallback, useRef } from 'react'

import { MessageInput } from '@/components/messageInput'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'

type Props = {
  onChatProcessStart: (text: string) => void
}

/**
 * テキスト入力と音声入力を提供する
 *
 * 音声認識の完了時は自動で送信し、返答文の生成中は入力を無効化する
 *
 */
export const MessageInputContainer = ({ onChatProcessStart }: Props) => {
  const [userMessage, setUserMessage] = useState('')
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const isRecognizingRef = useRef(false)
  const [isRecognizing, setIsRecognizing] = useState(false)

  // homeStoreから必要な状態を取得
  const autoRecognition = homeStore((s) => s.autoRecognition)
  const startRecognition = homeStore((s) => s.startRecognition)
  const chatProcessingCount = homeStore((s) => s.chatProcessingCount)

  // 状態を useRef で管理
  const autoRecognitionRef = useRef(autoRecognition)
  const chatProcessingCountRef = useRef(chatProcessingCount)

  // 状態の変更時に useRef を更新
  useEffect(() => {
    autoRecognitionRef.current = autoRecognition
  }, [autoRecognition])

  useEffect(() => {
    chatProcessingCountRef.current = chatProcessingCount
  }, [chatProcessingCount])

  // 音声認識を開始する関数
  const startSpeechRecognition = useCallback(() => {
    if (isRecognizingRef.current) {
      return
    }

    if (chatProcessingCountRef.current > 0) {
      return
    }

    try {
      speechRecognitionRef.current?.start()
    } catch (error: any) {
      if (error.name !== 'InvalidStateError') {
        console.error('Error starting speech recognition:', error)
      }
    }
  }, [])

  // 音声認識を停止する関数
  const stopSpeechRecognition = useCallback(() => {
    if (isRecognizingRef.current) {
      speechRecognitionRef.current?.stop()
    }
  }, [])

  // 音声認識の初期化
  useEffect(() => {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition

    // FirefoxなどSpeechRecognition非対応環境対策
    if (!SpeechRecognition) {
      console.error('SpeechRecognition is not supported in this browser.')
      return
    }

    const ss = settingsStore.getState()
    const recognition = new SpeechRecognition()
    recognition.lang = ss.selectVoiceLanguage
    recognition.interimResults = true // 認識の途中結果を返す
    recognition.continuous = false // 発言の終了時に認識を終了する

    recognition.onstart = () => {
      isRecognizingRef.current = true
      setIsRecognizing(true)
    }

    recognition.onend = () => {
      isRecognizingRef.current = false
      setIsRecognizing(false)
      // 継続的な音声認識の場合、AIが発話中でなければ再開する
      if (autoRecognitionRef.current && chatProcessingCountRef.current === 0) {
        startSpeechRecognition()
      }
    }

    recognition.onerror = (event) => {
      isRecognizingRef.current = false
      setIsRecognizing(false)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
      setUserMessage(transcript)

      if (event.results[0].isFinal) {
        onChatProcessStart(transcript)
        setUserMessage('') // テキスト欄をクリア
      }
    }

    speechRecognitionRef.current = recognition

    // クリーンアップ
    return () => {
      recognition.stop()
    }
  }, [onChatProcessStart, startSpeechRecognition])

  // startRecognitionの変化を監視して、一度きりの音声認識を開始
  useEffect(() => {
    if (startRecognition) {
      homeStore.setState({ startRecognition: false })
      startSpeechRecognition()
    }
  }, [startRecognition, startSpeechRecognition])

  // autoRecognitionの変化を監視して、音声認識を開始・停止
  useEffect(() => {
    if (autoRecognition) {
      if (!isRecognizingRef.current && chatProcessingCount === 0) {
        startSpeechRecognition()
      }
    } else {
      if (isRecognizingRef.current) {
        stopSpeechRecognition()
      }
    }
  }, [autoRecognition, chatProcessingCount, startSpeechRecognition, stopSpeechRecognition])

  // chatProcessingCountの変化を監視して、AIの発話中は音声認識を停止する
  useEffect(() => {
    if (chatProcessingCount > 0) {
      if (isRecognizingRef.current) {
        stopSpeechRecognition()
      }
    } else {
      if (autoRecognition && !isRecognizingRef.current) {
        startSpeechRecognition()
      }
    }
  }, [chatProcessingCount, autoRecognition, startSpeechRecognition, stopSpeechRecognition])

  const handleClickMicButton = () => {
    if (isRecognizingRef.current) {
      stopSpeechRecognition()
    } else {
      startSpeechRecognition()
    }
  }

  const handleClickSendButton = () => {
    if (userMessage.trim() === '') {
      return
    }
    onChatProcessStart(userMessage.trim())
    setUserMessage('') // テキスト欄をクリア
  }

  const handleChangeUserMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserMessage(e.target.value)
  }

  return (
    <MessageInput
      userMessage={userMessage}
      isMicRecording={isRecognizing}
      onChangeUserMessage={handleChangeUserMessage}
      onClickMicButton={handleClickMicButton}
      onClickSendButton={handleClickSendButton}
    />
  )
}
