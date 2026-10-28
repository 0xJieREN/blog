import { ImageResponse } from 'next/og'

export function GET(request: Request) {
  let url = new URL(request.url)
  let title = url.searchParams.get('title') || '杰的个人主页'

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full justify-between bg-[#fcfcfb] text-[#161615] p-20">
        <div tw="flex flex-col text-3xl">
          <p tw="m-0">杰</p>
          <p tw="m-0 text-[#8b8b85]">独立开发者</p>
        </div>
        <h2 tw="flex max-w-4xl text-6xl font-medium tracking-tight text-left">
          {title}
        </h2>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
