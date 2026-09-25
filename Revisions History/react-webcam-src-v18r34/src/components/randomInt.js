// we'll use this for key's, it's good enough for our needs
export function getRandomInt() {
    return Math.floor(Math.random() * 999999999);
}

export function getRandomElement(arr) {
    if (arr.length === 0) {
        return undefined; // Handle case where array is empty
    }
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}
