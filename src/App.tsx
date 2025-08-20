import React, { useState, useCallback } from 'react'
import { Upload, Shield, Zap, Eye, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import { cn } from './lib/utils'

interface AnalysisResult {
  jobId: string
  isDeepfake: boolean
  confidence: number
  analysisDetails: any
  processingTimeMs: number
  status: string
}

interface UploadState {
  file: File | null
  uploading: boolean
  analyzing: boolean
  progress: number
  result: AnalysisResult | null
  error: string | null
}

function App() {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    analyzing: false,
    progress: 0,
    result: null,
    error: null
  })
  const [analysisMode, setAnalysisMode] = useState<'quick_scan' | 'full_analysis'>('quick_scan')
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setUploadState(prev => ({ ...prev, file, error: null }))
      } else {
        setUploadState(prev => ({ ...prev, error: 'Please upload an image or video file' }))
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setUploadState(prev => ({ ...prev, file, error: null }))
      } else {
        setUploadState(prev => ({ ...prev, error: 'Please upload an image or video file' }))
      }
    }
  }

  const startAnalysis = async () => {
    if (!uploadState.file) return

    setUploadState(prev => ({ ...prev, uploading: true, progress: 0, error: null, result: null }))

    try {
      // Convert file to base64
      const reader = new FileReader()
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(uploadState.file!)
      })

      setUploadState(prev => ({ ...prev, progress: 25 }))

      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('deepfake-upload', {
        body: {
          fileData,
          fileName: uploadState.file.name,
          analysisType: analysisMode
        }
      })

      if (uploadError) throw uploadError

      setUploadState(prev => ({ ...prev, uploading: false, analyzing: true, progress: 50 }))

      // Start analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('deepfake-analysis', {
        body: {
          jobId: uploadData.data.jobId,
          fileUrl: uploadData.data.publicUrl,
          analysisType: analysisMode
        }
      })

      if (analysisError) throw analysisError

      setUploadState(prev => ({ 
        ...prev, 
        analyzing: false, 
        progress: 100,
        result: analysisData.data
      }))

    } catch (error: any) {
      setUploadState(prev => ({ 
        ...prev, 
        uploading: false, 
        analyzing: false, 
        error: error.message || 'Analysis failed',
        progress: 0
      }))
    }
  }

  const resetAnalysis = () => {
    setUploadState({
      file: null,
      uploading: false,
      analyzing: false,
      progress: 0,
      result: null,
      error: null
    })
  }

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400'
    if (confidence >= 0.7) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DeepGuard AI</h1>
                <p className="text-sm text-gray-400">Advanced Deepfake Detection</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Powered by Advanced AI</p>
              <p className="text-xs text-gray-500">Secure & Confidential</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!uploadState.result ? (
          <div className="space-y-8">
            {/* Analysis Mode Selection */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-blue-400" />
                Analysis Mode
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setAnalysisMode('quick_scan')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all duration-200',
                    analysisMode === 'quick_scan'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-gray-600 hover:border-gray-500 text-gray-300'
                  )}
                >
                  <div className="flex items-center mb-2">
                    <Zap className="h-5 w-5 mr-2" />
                    <span className="font-medium">Quick Scan</span>
                  </div>
                  <p className="text-sm opacity-80">Fast analysis (~3 seconds)</p>
                  <p className="text-xs opacity-60 mt-1">Basic detection with good accuracy</p>
                </button>
                <button
                  onClick={() => setAnalysisMode('full_analysis')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all duration-200',
                    analysisMode === 'full_analysis'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-gray-600 hover:border-gray-500 text-gray-300'
                  )}
                >
                  <div className="flex items-center mb-2">
                    <Eye className="h-5 w-5 mr-2" />
                    <span className="font-medium">Full Analysis</span>
                  </div>
                  <p className="text-sm opacity-80">Deep analysis (~10 seconds)</p>
                  <p className="text-xs opacity-60 mt-1">Comprehensive detection with highest accuracy</p>
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-blue-400" />
                Upload Media File
              </h2>
              
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
                  dragOver
                    ? 'border-blue-400 bg-blue-400/5'
                    : 'border-gray-600 hover:border-gray-500'
                )}
              >
                {uploadState.file ? (
                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-white font-medium">{uploadState.file.name}</p>
                      <p className="text-gray-400 text-sm">
                        {(uploadState.file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      onClick={startAnalysis}
                      disabled={uploadState.uploading || uploadState.analyzing}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                    >
                      {uploadState.uploading || uploadState.analyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          {uploadState.uploading ? 'Uploading...' : 'Analyzing...'}
                        </>
                      ) : (
                        'Start Analysis'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-500 mx-auto" />
                    <div>
                      <p className="text-white font-medium mb-1">Drop your file here</p>
                      <p className="text-gray-400 text-sm">or click to browse</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors duration-200"
                    >
                      Choose File
                    </label>
                    <p className="text-xs text-gray-500">Supports: JPG, PNG, MP4, MOV (max 100MB)</p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {(uploadState.uploading || uploadState.analyzing) && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>
                      {uploadState.uploading ? 'Uploading...' : 'Analyzing...'}
                    </span>
                    <span>{uploadState.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadState.error && (
                <div className="mt-4 bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-red-300">{uploadState.error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Results Display */
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-blue-400" />
                  Analysis Results
                </h2>
                <button
                  onClick={resetAnalysis}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  New Analysis
                </button>
              </div>

              {/* Main Result */}
              <div className={cn(
                'rounded-lg p-6 mb-6',
                uploadState.result.isDeepfake
                  ? 'bg-red-900/20 border border-red-700'
                  : 'bg-green-900/20 border border-green-700'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {uploadState.result.isDeepfake ? (
                      <AlertTriangle className="h-8 w-8 text-red-400 mr-3" />
                    ) : (
                      <Check className="h-8 w-8 text-green-400 mr-3" />
                    )}
                    <div>
                      <h3 className={cn(
                        'text-lg font-semibold',
                        uploadState.result.isDeepfake ? 'text-red-300' : 'text-green-300'
                      )}>
                        {uploadState.result.isDeepfake ? 'Potential Deepfake Detected' : 'Authentic Content'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Analysis completed in {(uploadState.result.processingTimeMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-2xl font-bold',
                      getConfidenceColor(uploadState.result.confidence)
                    )}>
                      {formatConfidence(uploadState.result.confidence)}
                    </div>
                    <p className="text-gray-400 text-sm">Confidence</p>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Analysis Type:</span>
                    <span className="text-white ml-2 capitalize">
                      {uploadState.result.analysisDetails.scan_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Processing Method:</span>
                    <span className="text-white ml-2 capitalize">
                      {uploadState.result.analysisDetails.processing_method?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-400">Features Analyzed:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {uploadState.result.analysisDetails.features_analyzed?.map((feature: string, index: number) => (
                        <span key={index} className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs">
                          {feature.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  {uploadState.result.analysisDetails.warnings?.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-gray-400">Warnings:</span>
                      <ul className="mt-1 space-y-1">
                        {uploadState.result.analysisDetails.warnings.map((warning: string, index: number) => (
                          <li key={index} className="text-yellow-400 text-xs flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-400 text-sm">
            <p>DeepGuard AI - Professional Deepfake Detection Technology</p>
            <p className="mt-1">Powered by Advanced Machine Learning Algorithms</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App