import { delay, http, HttpResponse } from 'msw';
import type { PostModel } from "../components/post-display-components/Posts"


// define an initial state, this should be immutable.
// when each test is run, reset the msw to THIS, then use a variable list for handling mutations and POSTS.
const initialPostsState: PostModel[] = [
            {
                id: "MockPost1",
                author: "MWSPost1",
                authorId: "mock-user-1",
                content: "Hello",
                date: "Wed Oct 07 2026 10:10:07 GMT+0100 (British Summer Time)",
                likes: 0
            },
            {
                id: "MockPost2",
                author: "MWSPost2",
                authorId: "mock-user-1",
                content: "Hello",
                date: "Wed Oct 07 2026 10:10:07 GMT+0100 (British Summer Time)",
                likes: 0
            },
            {
                id: "MockPost3",
                author: "MWSPost3",
                authorId: "mock-user-2",
                content: "Hello",
                date: "Wed Oct 07 2026 10:10:07 GMT+0100 (British Summer Time)",
                likes: 0
            },
            {
                id: "MockPost4",
                author: "MWSPost4",
                content: "Hello",
                date: "Wed Oct 07 2026 10:10:07 GMT+0100 (British Summer Time)",
                likes: 0
            },
    ]

    export var mockPosts = [...initialPostsState];

    export function resetMockPosts(): void {
        mockPosts = [...initialPostsState]
    };

// Mock user accounts. Passwords are plaintext ONLY because this is a stand-in for a real API, which must hash them.
interface MockUser {
    id: string
    username: string
    password: string
}

const initialUsersState: MockUser[] = [
    { id: "mock-user-1", username: "mockuser1", password: "password1" },
    { id: "mock-user-2", username: "mockuser2", password: "password2" },
]

// like the posts, users reset to this default state on refresh
export var mockUsers = [...initialUsersState];

export function resetMockUsers(): void {
    mockUsers = [...initialUsersState]
}

// mock tokens simply encode the user id; a real API would issue a signed token (e.g. JWT)
const TOKEN_PREFIX = "mock-token-"

// find the user a request is authenticated as, from its "Authorization: Bearer <token>" header.
// Like a JWT, the token carries the user id itself, so a saved login stays valid after the mock's
// in-memory state resets on refresh, even though the user is no longer in mockUsers.
function getRequestUser(request: Request): { id: string } | undefined {
    const prefix = "Bearer " + TOKEN_PREFIX
    const header = request.headers.get("Authorization")
    if (!header?.startsWith(prefix) || header.length === prefix.length) return undefined
    return { id: header.slice(prefix.length) }
}

function authResponse(user: MockUser, status = 200) {
    return HttpResponse.json(
        { token: TOKEN_PREFIX + user.id, user: { id: user.id, username: user.username } },
        { status }
    )
}

const unauthenticated = () => HttpResponse.json({ message: "You must be logged in" }, { status: 401 })





// worth reading: https://developer.mozilla.org/en-US/docs/Web/API/Response
export const handlers  = [
    // set up individual handlers, get requests etc
    // handles intercepting api requests

    // intercept "getPosts"
    http.get<never, never, PostModel[]>('http://localhost:3000/posts', async () => {
        return HttpResponse.json(mockPosts)
    }),

    // intercept "addPost", using the payload as the request
    http.post("http://localhost:3000/posts", async ({ request }) => {
        if (!getRequestUser(request)) return unauthenticated();
        const newPost = await request.json() as PostModel;
        mockPosts.push(newPost);
        return HttpResponse.json(newPost, { status: 201});
    }),

    // intercept addLikeToPostByIdMutation
    http.patch("http://localhost:3000/posts/:postId", async ({ params, request }) => {
        if (!getRequestUser(request)) return unauthenticated();
        const { likes } = await request.json() as { likes: number};
        const id = params.postId;
        // console.log("Likes: " + likes);
        // console.log("Id: " + id)
        const postToUpdateIndex = mockPosts.findIndex(post => post.id === id);
        if (postToUpdateIndex === -1) {
            return HttpResponse.json({ message: "Post with index " + postToUpdateIndex + " not found" }, { status: 404 });
        }
        mockPosts = mockPosts.map((post) =>
            post.id === id ? { ...post, likes } : post
        );

        return HttpResponse.json(mockPosts[postToUpdateIndex]);

    }),

    // intercept deletePostByPostIdMutation
    http.delete("http://localhost:3000/posts/:postId", async ({ params, request }) => {
        // const { postToDelete } = await request.json() as { postToDelete: PostModel};
        const requestUser = getRequestUser(request);
        if (!requestUser) return unauthenticated();

        const id = params.postId;
        const postToDelete = mockPosts.find(post => post.id === id)
        if (postToDelete && postToDelete.authorId !== requestUser.id) {
            return HttpResponse.json({ message: "You can only delete your own posts" }, { status: 403 });
        }
        mockPosts = mockPosts.filter(post => post.id !== id)
        return HttpResponse.json();

    }),

    // intercept login
    http.post("http://localhost:3000/login", async ({ request }) => {
        const { username, password } = await request.json() as { username: string, password: string };
        const user = mockUsers.find(u => u.username === username && u.password === password)
        if (!user) {
            return HttpResponse.json({ message: "Invalid username or password" }, { status: 401 });
        }
        return authResponse(user);
    }),

    // intercept register; usernames must be unique
    http.post("http://localhost:3000/users", async ({ request }) => {
        const { username, password } = await request.json() as { username: string, password: string };
        if (!username || !password) {
            return HttpResponse.json({ message: "Username and password are required" }, { status: 400 });
        }
        if (mockUsers.some(u => u.username === username)) {
            return HttpResponse.json({ message: "That username is already taken" }, { status: 409 });
        }
        const newUser: MockUser = { id: crypto.randomUUID(), username, password }
        mockUsers.push(newUser)
        return authResponse(newUser, 201);
    }),

]