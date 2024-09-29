import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageInput } from '@/components/messageInput'
import settingsStore from '@/features/stores/settings'
import homeStore from '@/features/stores/home'

type Props = {
  onChatProcessStart: (text: string) => void
}

export const MessageInputContainer = ({ onChatProcessStart }: Props) => {
  const [userMessage, setUserMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null) // recognitionをuseRefで管理
  const isListeningRef = useRef(isListening) // isListeningをuseRefで管理
  const keyPressStartTime = useRef<number | null>(null)
  const transcriptRef = useRef('')
  const isKeyboardTriggered = useRef(false)
  const isRecognizingRef = useRef(false)

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

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition && !isListeningRef.current) {
      if (chatProcessingCountRef.current > 0) {
        return
      }
      transcriptRef.current = ''
      setUserMessage('')
      try {
        recognition.start()
        setIsListening(true)
      } catch (error: any) {
        if (error.name !== 'InvalidStateError') {
          console.error('音声認識の開始エラー:', error)
        }
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition && isListeningRef.current) {
      recognition.stop()
      setIsListening(false)
      if (isKeyboardTriggered.current) {
        const pressDuration = Date.now() - (keyPressStartTime.current || 0)
        if (pressDuration >= 1000 && transcriptRef.current.trim()) {
          onChatProcessStart(transcriptRef.current)
          setUserMessage('')
        }
        isKeyboardTriggered.current = false
      } else if (transcriptRef.current.trim()) {
        onChatProcessStart(transcriptRef.current)
        setUserMessage('')
      }
    }
  }, [onChatProcessStart])

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening()
    } else {
      startListening()
    }
  }, [startListening, stopListening])

  // 音声認識の初期化
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const newRecognition = new SpeechRecognition()
      const ss = settingsStore.getState()
      newRecognition.lang = ss.selectVoiceLanguage
      newRecognition.continuous = false // 発言ごとに認識を終了
      newRecognition.interimResults = false // 途中結果を無視

      newRecognition.onstart = () => {
        isRecognizingRef.current = true
        setIsListening(true)
      }

      newRecognition.onend = () => {
        isRecognizingRef.current = false
        setIsListening(false)
        // 自動認識が有効で、AIが話していない場合、少し待ってから認識を再開
        if (autoRecognitionRef.current && chatProcessingCountRef.current === 0) {
          setTimeout(() => {
            startListening()
          }, 500) // 500ms待機してから再開
        }
      }

      newRecognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1
        const result = event.results[lastResultIndex]
        if (result.isFinal) {
          const transcript = result[0].transcript.trim()
          if (transcript) {
            onChatProcessStart(transcript)
            setUserMessage('')
          }
        }
      }

      newRecognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error)
        setIsListening(false)
      }

      recognitionRef.current = newRecognition
    } else {
      console.error('このブラウザではSpeechRecognitionはサポートされていません。')
    }
  }, [])

  // startRecognitionの変化を監視して、一度きりの音声認識を開始
  useEffect(() => {
    if (startRecognition) {
      homeStore.setState({ startRecognition: false })
      startListening()
    }
  }, [startRecognition, startListening])

  // autoRecognitionの変化を監視して、音声認識を開始・停止
  useEffect(() => {
    if (autoRecognition) {
      if (!isListeningRef.current && chatProcessingCount === 0) {
        startListening()
      }
    } else {
      if (isListeningRef.current) {
        stopListening()
      }
    }
  }, [autoRecognition, chatProcessingCount, startListening, stopListening])

  // chatProcessingCountの変化を監視して、AIが話している間は音声認識を停止
  useEffect(() => {
    if (chatProcessingCount > 0) {
      if (isListeningRef.current) {
        stopListening()
      }
    } else {
      if (autoRecognition && !isListeningRef.current) {
        startListening()
      }
    }
  }, [chatProcessingCount, autoRecognition, startListening, stopListening])

  // キーボードイベントのハンドリング
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && !isListeningRef.current) {
        keyPressStartTime.current = Date.now()
        isKeyboardTriggered.current = true
        startListening()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.key === 'Meta') {
        stopListening()
        keyPressStartTime.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [startListening, stopListening])

  const handleSendMessage = useCallback(() => {
    if (userMessage.trim()) {
      onChatProcessStart(userMessage)
      setUserMessage('')
    }
  }, [userMessage, onChatProcessStart])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setUserMessage(e.target.value)
    },
    []
  )

  return (
    <MessageInput
      userMessage={userMessage}
      isMicRecording={isListening}
      onChangeUserMessage={handleInputChange}
      onClickMicButton={toggleListening}
      onClickSendButton={handleSendMessage}
    />
  )
}
