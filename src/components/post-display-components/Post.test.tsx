import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest';
import Post from './Post';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MemoryRouter } from 'react-router';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetMockPosts, mockPosts } from '../../mocks/handlers';
// Redux imports
import { store } from '../../app/store.ts'
import { addPosts } from '../../features/postsSlice.ts';
import { setCredentials, logout } from '../../features/authSlice.ts';
import { Provider } from 'react-redux'

import { setupServer } from 'msw/node'
import { handlers } from '../../mocks/handlers'

const server = setupServer(...handlers)


// Aim of this testing suite is to have sequential testing, where the previous test may explain why future tests fail.
// For example, the first test first checks to see that the post actually renders - if this fails we know what to target first.
describe ("Post", () => {

    beforeAll(() => {
        server.listen() // listen to the MWS server with handlers to intercept API requests
    })

    afterEach( () => {
        server.resetHandlers(); 
        resetMockPosts();   // reset mockPosts exported from handlers to a default state for testing consistency
        store.dispatch(logout());
        cleanup();          // reset HTML state
    })

    beforeEach( () => {
        resetMockPosts();
        // log in as "mockuser1", who owns MockPost1 and MockPost2 (token format is defined in handlers)
        store.dispatch(setCredentials({ user: { id: "mock-user-1", username: "mockuser1" }, token: "mock-token-mock-user-1" }));
        //populate redux with mock posts
        store.dispatch(addPosts(mockPosts));    // reload the Redux store with mockPosts defined in handlers
        cleanup();

        
    })

    afterAll(() => {
     // Disable request interception and clean up.
        server.close()
    })

    it("correctly renders a Post component, with values propagated from mockPosts[0] - id = 'MockPost1'", () => {
        // render the first post in mockPosts
        // see handlers to see what this post contains
        let postToTest = mockPosts[0]
        render(
            <MemoryRouter>
                <Provider store={store}>
                    <Post postId={postToTest.id}/>
                </Provider>
            </MemoryRouter>
        )

        // search by text validate MSWPost1 (author) has been rendered
        expect(screen.getByText(/MWSPost1/)).toBeInTheDocument();
    });
    
    it("contains a like button button with accessible text 'Like post' for screen readers", () => {
        let postToTest = mockPosts[0]
        render(
            <MemoryRouter>
                <Provider store={store}>
                    <Post postId={postToTest.id}/>
                </Provider>
            </MemoryRouter>
        )
        
        const likeButton = screen.getByRole("button", {name: "Like post"});
        expect(likeButton).toBeInTheDocument();
        expect(likeButton).toHaveAccessibleName("Like post");
    });
    

    it("increments like count within database, Redux, and visual HTML on like button click", async () => {
        let postToTest = mockPosts[0]
        render(
            <MemoryRouter>
                <Provider store={store}>
                    <Post postId={postToTest.id}/>
                </Provider>
            </MemoryRouter>
        )
        


        const likeButton = screen.getByRole("button", {name: "Like post"});

        // first check to see if the like button has been located, this way if this test fails we know the reason is related to UI, not functionality.
        expect(likeButton, "Like button not found").toBeInTheDocument();
        

        // set up user event
        const user = userEvent.setup();


        // assume await is to simulate user action - they have to move mouse to button before click or keyboard focus it
        await user.click(likeButton);

        expect(await mockPosts[0].likes, "Like count not updated in database through API call").toBe(1);

        expect(await (store.getState().posts.value[0].likes === 1), "Redux Store Like count not updated").toBeTruthy();
        
        expect(await screen.findByText("1 like"), "HTML Like count not updated").toBeInTheDocument();
    });

    it("contains a delete button with accessible text 'Delete' for screen readers", () => {
        let postToTest = mockPosts[0]
        render(
            <MemoryRouter>
                <Provider store={store}>
                    <Post postId={postToTest.id}/>
                </Provider>
            </MemoryRouter>
        )


        const deleteButton = screen.getByRole("button", {name: "Delete"});
        expect(deleteButton).toBeInTheDocument();
    });

    // async function as this involves an API call
    it("removes post from database and Redux store on delete button clicked", async () => {
        let postToTest = mockPosts[0]
        // let lengthOfMockPostsPreDeletion = mockPosts.length;

        // convert mockPosts to a list of ID's without the postToTest (toDelete)
        let expectedPostIds = mockPosts
            .filter(post => post.id !== postToTest.id)
            .map(post => post.id)

        render(
            <MemoryRouter>
                <Provider store={store}>
                    <Post postId={postToTest.id}/>
                </Provider>
            </MemoryRouter>
        )

        const deleteButton = screen.getByRole("button", {name: "Delete"});
        expect(deleteButton, "Delete button not found").toBeInTheDocument();
        
        const user = userEvent.setup();
        await user.click(deleteButton);

        expect(await mockPosts.map(post => post.id), "Like count not updated in database through API call").toEqual(expectedPostIds);

        expect(await (store.getState().posts.value.map(post => post.id)), "Redux Store Like count not updated").toEqual(expectedPostIds);
        

        // as rendering of Post components is handled by Posts, once the delete button has updated both the database and the store
        // it has done all of its responsibilities. Not rendering the deleted post will be handled by Posts.tsx, in an integration test.

    })

    function renderPost(postId: string) {
        render(
            <MemoryRouter>
                <Provider store={store}>
                    <Post postId={postId}/>
                </Provider>
            </MemoryRouter>
        )
    }

    it("hides the like and delete buttons when logged out", () => {
        store.dispatch(logout());
        renderPost(mockPosts[0].id);

        expect(screen.getByText(/MWSPost1/)).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Like post"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Delete"})).not.toBeInTheDocument();
    });

    it("shows the delete button only on posts owned by the logged in user", () => {
        // MockPost3 belongs to mock-user-2, MockPost4 has no owner at all
        renderPost("MockPost3");
        expect(screen.getByRole("button", {name: "Like post"}), "Like should be available to any logged in user").toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Delete"}), "Delete shown on someone else's post").not.toBeInTheDocument();

        cleanup();
        renderPost("MockPost4");
        expect(screen.queryByRole("button", {name: "Delete"}), "Delete shown on an unowned post").not.toBeInTheDocument();
    });

            // TESTS TO WRITE:
            // REMOVAL FROM REDUX
            // REMOVAL FROM HTML

    
    
});
