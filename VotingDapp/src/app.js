App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        return await App.initWeb3();
    },

    initWeb3: async function() {
        // Check if MetaMask (or any Ethereum provider) is available
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access from the user
                await window.ethereum.request({ method: "eth_requestAccounts" });
            } catch (error) {
                console.error("User denied account access");
                alert("Please allow access to your MetaMask account to vote.");
            }
        } else if (window.web3) {
            // Legacy dapp browsers (fallback to web3)
            App.web3Provider = window.web3.currentProvider;
        } else {
            // Fallback to local Ganache
            App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
        }

        web3 = new Web3(App.web3Provider);

        // Detect account or network changes in MetaMask
        window.ethereum.on('accountsChanged', function(accounts) {
            App.handleAccountChange(accounts);
        });

        window.ethereum.on('networkChanged', function(networkId) {
            App.handleNetworkChange(networkId);
        });

        return App.initContract();
    },

    handleAccountChange: function(accounts) {
        if (accounts.length === 0) {
            alert('Please connect to MetaMask.');
        } else {
            // Refresh the displayed votes if account changes
            document.getElementById('add').innerHTML = accounts[0];
            App.displayVotes();
        }
    },

    handleNetworkChange: function(networkId) {
        console.log('Network changed to: ', networkId);
        // Optionally refresh the page or reload contracts for a different network
        App.initWeb3();
    },

    initContract: async function() {
        // Load the contract artifact
        $.getJSON('voting.json', function(data) {
            var votingArtifact = data;
            App.contracts.voting = TruffleContract(votingArtifact);
            App.contracts.voting.setProvider(App.web3Provider);
            return App.displayVotes();
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '.btn-vote', App.handleVote);
    },

    displayVotes: function() {
        var votingInstance;
        // Get contract instance and display votes
        App.contracts.voting.deployed().then(function(instance) {
            votingInstance = instance;
            return votingInstance.viewVotes.call();
        }).then(function(votes) {
            // Update the vote counts on the frontend
            document.getElementById('v1').innerHTML = votes[0];
            document.getElementById('v2').innerHTML = votes[1];
            document.getElementById('v3').innerHTML = votes[2];
        }).catch(function(err) {
            console.error("Error fetching votes: ", err.message);
        });
    },

    handleVote: async function(event) {
        event.preventDefault();
        const candidateId = parseInt($(event.target).attr('data-id'));

        try {
            // Get connected accounts
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            // Get the contract instance and cast the vote
            const votingInstance = await App.contracts.voting.deployed();
            await votingInstance.castVote(candidateId, { from: account });

            // Update the wallet address on the frontend
            document.getElementById('add').innerHTML = account;

            // Refresh the displayed votes after casting the vote
            return App.displayVotes();
        } catch (err) {
            console.error("Error casting vote: ", err.message);

            if (err.message.includes("User denied transaction signature")) {
                alert("Transaction was denied.");
            } else if (err.message.includes("You have already voted")) {
                alert("You have already voted!");
            } else {
                alert("An error occurred while casting your vote.");
            }
        }
    }
};

$(window).on('load', function() {
    App.init();
});
