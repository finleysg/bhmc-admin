"use client"

import Link from "@tiptap/extension-link"
import type { Editor } from "@tiptap/react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useCallback, useEffect, useRef, useState } from "react"
import { Markdown } from "tiptap-markdown"

import "./editor.css"

import { LinkDialog } from "./link-dialog"
import { EditorToolbar } from "./toolbar"

function getMarkdown(editor: Editor): string {
	// tiptap-markdown stores its API on editor.storage.markdown
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
	return (editor.storage as any).markdown.getMarkdown() as string
}

interface ContentEditorProps {
	value: string
	onChange: (value: string) => void
	minHeight?: string
	maxHeight?: string
	className?: string
	disabled?: boolean
	placeholder?: string
}

export function ContentEditor({
	value,
	onChange,
	minHeight = "200px",
	maxHeight,
	className,
	disabled,
	placeholder,
}: ContentEditorProps) {
	const [isMarkdownMode, setIsMarkdownMode] = useState(false)
	const [markdownText, setMarkdownText] = useState("")
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
	const lastEmittedRef = useRef(value)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const editor = useEditor({
		extensions: [
			StarterKit,
			Markdown,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline",
				},
			}),
		],
		immediatelyRender: false,
		editable: !disabled,
		editorProps: {
			attributes: {
				class: "p-4 focus:outline-none",
				style: `min-height: ${minHeight}`,
				...(placeholder ? { "data-placeholder": placeholder } : {}),
			},
		},
		onUpdate: ({ editor: ed }) => {
			const md = getMarkdown(ed)
			lastEmittedRef.current = md
			onChange(md)
		},
	})

	// Set initial content once editor is ready
	const initialized = useRef(false)
	useEffect(() => {
		if (editor && !initialized.current) {
			initialized.current = true
			editor.commands.setContent(value)
			lastEmittedRef.current = value
		}
	}, [editor, value])

	// Sync external value changes (e.g., form reset)
	useEffect(() => {
		if (!editor || !initialized.current) return
		if (value !== lastEmittedRef.current) {
			lastEmittedRef.current = value
			editor.commands.setContent(value)
		}
	}, [editor, value])

	// Update editable state when disabled changes
	useEffect(() => {
		if (editor) {
			editor.setEditable(!disabled)
		}
	}, [editor, disabled])

	const switchToMarkdown = useCallback(() => {
		if (!editor) return
		const md = getMarkdown(editor)
		setMarkdownText(md)
		setIsMarkdownMode(true)
	}, [editor])

	const switchToWysiwyg = useCallback(() => {
		if (!editor) return
		editor.commands.setContent(markdownText)
		setIsMarkdownMode(false)
	}, [editor, markdownText])

	const handleToggleMode = useCallback(() => {
		if (isMarkdownMode) {
			switchToWysiwyg()
		} else {
			switchToMarkdown()
		}
	}, [isMarkdownMode, switchToWysiwyg, switchToMarkdown])

	const handleMarkdownChange = useCallback(
		(text: string) => {
			setMarkdownText(text)
			lastEmittedRef.current = text
			onChange(text)
		},
		[onChange],
	)

	const handleLinkSubmit = useCallback(
		(url: string) => {
			if (!editor) return
			if (url === "") {
				editor.chain().focus().extendMarkRange("link").unsetLink().run()
			} else {
				editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
			}
		},
		[editor],
	)

	if (!editor) return null

	const currentLinkUrl = (editor.getAttributes("link").href as string) ?? ""

	return (
		<div className={`overflow-hidden rounded-lg border border-base-300 ${className ?? ""}`}>
			<EditorToolbar
				editor={editor}
				isMarkdownMode={isMarkdownMode}
				onToggleMode={handleToggleMode}
				onLinkClick={() => setIsLinkDialogOpen(true)}
			/>
			{isMarkdownMode ? (
				<textarea
					ref={textareaRef}
					value={markdownText}
					onChange={(e) => handleMarkdownChange(e.target.value)}
					className="content-editor-scroll w-full resize-y bg-base-100 p-4 font-mono text-sm focus:outline-none"
					style={{ minHeight, maxHeight }}
					disabled={disabled}
					placeholder={placeholder}
				/>
			) : (
				<div
					className="content-editor-scroll bg-base-100"
					style={
						{
							maxHeight,
							"--editor-min-height": minHeight,
							"--editor-max-height": maxHeight ?? "none",
						} as React.CSSProperties
					}
				>
					<EditorContent editor={editor} />
				</div>
			)}
			<LinkDialog
				isOpen={isLinkDialogOpen}
				onClose={() => setIsLinkDialogOpen(false)}
				onSubmit={handleLinkSubmit}
				initialUrl={currentLinkUrl}
			/>
		</div>
	)
}
