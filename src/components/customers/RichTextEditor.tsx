import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite...',
  className,
  disabled,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalChange = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      let displayValue = value
      if (value && !/<[^>]+>/.test(value) && value.includes('\n')) {
        displayValue = value.replace(/\n/g, '<br>')
      }
      if (editorRef.current.innerHTML !== displayValue) {
        editorRef.current.innerHTML = displayValue
      }
    }
    isInternalChange.current = false
  }, [value])

  const exec = (command: string) => {
    document.execCommand(command, false)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
    editorRef.current?.focus()
  }

  const handleInput = () => {
    isInternalChange.current = true
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const toolbarBtn = (cmd: string, icon: React.ReactNode, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => exec(cmd)}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
    </Button>
  )

  return (
    <div className={cn('rounded-md border', className)}>
      <div className="flex items-center gap-1 border-b p-1.5 bg-muted/30">
        {toolbarBtn('bold', <Bold className="h-4 w-4" />, 'Negrito')}
        {toolbarBtn('italic', <Italic className="h-4 w-4" />, 'Itálico')}
        {toolbarBtn('underline', <Underline className="h-4 w-4" />, 'Sublinhado')}
        <div className="w-px h-6 bg-border mx-1" />
        {toolbarBtn('insertUnorderedList', <List className="h-4 w-4" />, 'Lista')}
        {toolbarBtn('insertOrderedList', <ListOrdered className="h-4 w-4" />, 'Lista numerada')}
      </div>
      <div className="relative">
        {!value && (
          <span className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          suppressContentEditableWarning
          className="min-h-[200px] p-3 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
        />
      </div>
    </div>
  )
}
