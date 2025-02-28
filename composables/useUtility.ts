

export const useUtility = () => {
    const mailTo = () => {
        document.location.href = "mailto:pj@peterjespersen.com";
    };
    return { mailTo }
}