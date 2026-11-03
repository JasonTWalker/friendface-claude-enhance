import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import NavBar from './NavBar';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { store } from '../../app/store';
import { logout, setCredentials } from '../../features/authSlice';

// NavBar reads the logged in user from Redux, so it needs the store as well as a router
function renderNavBar(initialEntries?: string[]) {
    render(
        <MemoryRouter initialEntries={initialEntries}>
            <Provider store={store}>
                <NavBar />
            </Provider>
        </MemoryRouter>
    );
}

describe("NavBar", () => {
    // fixes issues wherein whichever of the next two tests came second would fail
    // due to finding multiple matching results.
    // presumably without, each test renders its own version of NavBar
    afterEach(() => {
        cleanup();
        store.dispatch(logout());
    });

    it("renders a link to authors page '/authors' with name 'Authors'", () => {
        renderNavBar();
        expect(screen.getByRole("link", {name: "Authors"})).toHaveAttribute('href', '/authors')
    });

    it("renders a link to home page '/' with name 'Home'", () => {
        renderNavBar();
        expect(screen.getByRole("link", {name: "Home"})).toHaveAttribute('href', '/')
    });

    it("authors page '/authors' sets 'Authors' navlink to active, 'Home' to not be active", () => {
        renderNavBar(["/authors"]);
        // verify that "Authors" has active class
        expect(screen.getByRole("link", {name : "Authors"})).toHaveClass("active");
        expect(screen.getByRole("link", { name : "Home"})).not.toHaveClass("active");
    });

    it("home page '/' sets 'Home' navlink to active, 'Authors' to not be active", () => {
        renderNavBar(["/"]);
        // verify that "Authors" has active class
        expect(screen.getByRole("link", {name : "Home"})).toHaveClass("active");
        expect(screen.getByRole("link", { name : "Authors"})).not.toHaveClass("active");
    });

    it("shows log in and register links, and no log out button, when logged out", () => {
        renderNavBar();
        expect(screen.getByRole("link", {name: "Log in"})).toHaveAttribute('href', '/login');
        expect(screen.getByRole("link", {name: "Register"})).toHaveAttribute('href', '/register');
        expect(screen.queryByRole("button", {name: "Log out"})).not.toBeInTheDocument();
    });

    it("shows the username and a log out button, instead of log in links, when logged in", () => {
        store.dispatch(setCredentials({ user: { id: "u1", username: "alice" }, token: "t" }));
        renderNavBar();
        expect(screen.getByText(/alice/)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Log out"})).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: "Log in"})).not.toBeInTheDocument();
    });

    it("clears the logged in user and localStorage when log out is clicked", async () => {
        store.dispatch(setCredentials({ user: { id: "u1", username: "alice" }, token: "t" }));
        renderNavBar();

        await userEvent.setup().click(screen.getByRole("button", {name: "Log out"}));

        expect(store.getState().auth, "Redux auth state not cleared").toEqual({ user: null, token: null });
        expect(localStorage.getItem("friendface-auth"), "localStorage login not cleared").toBeNull();
        expect(screen.getByRole("link", {name: "Log in"})).toBeInTheDocument();
    });
});
