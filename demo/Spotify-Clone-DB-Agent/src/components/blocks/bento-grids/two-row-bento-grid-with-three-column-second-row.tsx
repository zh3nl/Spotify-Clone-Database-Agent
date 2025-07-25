export default function TwoRowBentoGridWithThreeColumnSecondRow() {
    return (
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <h2 className="text-base/7 font-semibold text-indigo-600">Deploy faster</h2>
          <p className="mt-2 max-w-lg text-4xl font-semibold tracking-tight text-pretty text-gray-950 sm:text-5xl">
            Everything you need to deploy your app
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
            <div className="relative lg:col-span-3">
              <div className="absolute inset-0 rounded-lg bg-white max-lg:rounded-t-4xl lg:rounded-tl-4xl" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-t-[calc(2rem+1px)] lg:rounded-tl-[calc(2rem+1px)]">
                <img
                  alt=""
                  src="https://tailwindcss.com/plus-assets/img/component-images/bento-01-performance.png"
                  className="h-80 object-cover object-left"
                />
  
                <div className="p-10 pt-4">
                  <h3 className="text-sm/4 font-semibold text-indigo-600">Performance</h3>
                  <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">Lightning-fast builds</p>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. In gravida justo et nulla efficitur, maximus
                    egestas sem pellentesque.
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 max-lg:rounded-t-4xl lg:rounded-tl-4xl" />
            </div>
            <div className="relative lg:col-span-3">
              <div className="absolute inset-0 rounded-lg bg-white lg:rounded-tr-4xl" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] lg:rounded-tr-[calc(2rem+1px)]">
                <img
                  alt=""
                  src="https://tailwindcss.com/plus-assets/img/component-images/bento-01-releases.png"
                  className="h-80 object-cover object-left lg:object-right"
                />
  
                <div className="p-10 pt-4">
                  <h3 className="text-sm/4 font-semibold text-indigo-600">Releases</h3>
                  <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">Push to deploy</p>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Curabitur auctor, ex quis auctor venenatis, eros arcu rhoncus massa, laoreet dapibus ex elit vitae
                    odio.
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 lg:rounded-tr-4xl" />
            </div>
            <div className="relative lg:col-span-2">
              <div className="absolute inset-0 rounded-lg bg-white lg:rounded-bl-4xl" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] lg:rounded-bl-[calc(2rem+1px)]">
                <img
                  alt=""
                  src="https://tailwindcss.com/plus-assets/img/component-images/bento-01-speed.png"
                  className="h-80 object-cover object-left"
                />
  
                <div className="p-10 pt-4">
                  <h3 className="text-sm/4 font-semibold text-indigo-600">Speed</h3>
                  <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">Built for power users</p>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Sed congue eros non finibus molestie. Vestibulum euismod augue.
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 lg:rounded-bl-4xl" />
            </div>
            <div className="relative lg:col-span-2">
              <div className="absolute inset-0 rounded-lg bg-white" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)]">
                <img
                  alt=""
                  src="https://tailwindcss.com/plus-assets/img/component-images/bento-01-integrations.png"
                  className="h-80 object-cover"
                />
  
                <div className="p-10 pt-4">
                  <h3 className="text-sm/4 font-semibold text-indigo-600">Integrations</h3>
                  <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">Connect your favorite tools</p>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Maecenas at augue sed elit dictum vulputate, in nisi aliquam maximus arcu.
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5" />
            </div>
            <div className="relative lg:col-span-2">
              <div className="absolute inset-0 rounded-lg bg-white max-lg:rounded-b-4xl lg:rounded-br-4xl" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-br-[calc(2rem+1px)]">
                <img
                  alt=""
                  src="https://tailwindcss.com/plus-assets/img/component-images/bento-01-network.png"
                  className="h-80 object-cover"
                />
  
                <div className="p-10 pt-4">
                  <h3 className="text-sm/4 font-semibold text-indigo-600">Network</h3>
                  <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">Globally distributed CDN</p>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Aenean vulputate justo commodo auctor vehicula in malesuada semper.
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 max-lg:rounded-b-4xl lg:rounded-br-4xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  