import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { highlight } from 'sugar-high'
import React from 'react'

function Table({ data }) {
  let headers = data.headers.map((header, index) => (
    <th key={index}>{header}</th>
  ))
  let rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ))

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

function CustomLink(props) {
  let href = props.href

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    )
  }

  if (href.startsWith('#')) {
    return <a {...props} />
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />
}

function RoundedImage(props) {
  return <Image alt={props.alt} className="rounded-lg" {...props} />
}

function Code({ children, ...props }) {
  let codeHTML = highlight(children)
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />
}

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim() // Remove whitespace from both ends of a string
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '') // Keep letters and digits in any script, _ and -
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
}

// Headings can hold inline code, bold or links, so children may be elements.
function getText(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(getText).join('')
  }
  return node?.props ? getText(node.props.children) : ''
}

// Returns a slug function for one document. Repeats get -1, -2, and so on.
function createSlugger() {
  let seen = new Set()

  return (text) => {
    let base = slugify(text) || 'heading'
    let slug = base
    let count = 0

    while (seen.has(slug)) {
      count += 1
      slug = `${base}-${count}`
    }

    seen.add(slug)
    return slug
  }
}

function createHeading(level, getSlug) {
  const Heading = ({ children }) => {
    let slug = getSlug(getText(children))
    return React.createElement(
      `h${level}`,
      { id: slug },
      [
        React.createElement('a', {
          href: `#${slug}`,
          key: `link-${slug}`,
          className: 'anchor',
        }),
      ],
      children
    )
  }

  Heading.displayName = `Heading${level}`

  return Heading
}

let components = {
  Image: RoundedImage,
  a: CustomLink,
  code: Code,
  Table,
}

export function CustomMDX(props) {
  let getSlug = createSlugger()

  return (
    <MDXRemote
      {...props}
      components={{
        ...components,
        h1: createHeading(1, getSlug),
        h2: createHeading(2, getSlug),
        h3: createHeading(3, getSlug),
        h4: createHeading(4, getSlug),
        h5: createHeading(5, getSlug),
        h6: createHeading(6, getSlug),
        ...(props.components || {}),
      }}
    />
  )
}
