import { ImageResponse } from 'next/og'

export function GET(request: Request) {
  let url = new URL(request.url)
  let title = url.searchParams.get('title') || '杰的个人主页'

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full justify-between bg-[#f7f9fb] text-[#1b2731] p-16">
        <p tw="text-2xl uppercase tracking-widest">Jared / AI 和 Finance</p>
        <div tw="flex w-full items-end justify-between">
          <h2 tw="flex max-w-4xl text-6xl font-medium tracking-tight text-left">
            {title}
          </h2>
          <p tw="text-3xl">杰</p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
