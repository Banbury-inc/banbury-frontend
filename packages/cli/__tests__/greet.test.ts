import { greetUser } from '../greet';

describe('greetUser', () => {
    let originalDate: DateConstructor;

    beforeAll(() => {
        originalDate = global.Date;
    });

    afterAll(() => {
        global.Date = originalDate;
    });

    it('should return default greeting with default user', () => {
        // Mock 2 PM
        const mockDate = new Date('2024-02-14T14:00:00');
        global.Date = class extends Date {
            constructor() {
                super();
                return mockDate;
            }
        } as DateConstructor;

        expect(greetUser()).toBe('Good afternoon, User!');
    });

}); 
