export async function fakeRequest<T>(data: T, time = 1000) {
  return new Promise<T>(resolve => {
    setTimeout(() => {
      resolve(data)
    }, time)
  })
}
